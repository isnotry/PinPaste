use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use arboard::Clipboard as Arboard;
use base64::Engine;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, RunEvent, State};
use tauri_plugin_global_shortcut::ShortcutState;

/// 获取当前前台（活跃）App 的名称，用于记录剪切板内容来源。
/// macOS 通过 NSWorkspace.frontmostApplication 获取；其它平台暂不支持，返回 None。
#[cfg(target_os = "macos")]
fn active_app_name() -> Option<String> {
    use objc2_app_kit::NSWorkspace;
    unsafe {
        let workspace = NSWorkspace::sharedWorkspace();
        let app = workspace.frontmostApplication()?;
        let name = app.localizedName()?;
        Some(name.to_string())
    }
}

#[cfg(not(target_os = "macos"))]
fn active_app_name() -> Option<String> {
    None
}

#[cfg(target_os = "macos")]
fn app_icon_base64(app_name: &str) -> Option<String> {
    use objc2_app_kit::NSWorkspace;
    use objc2_foundation::NSString;

    unsafe {
        let workspace = NSWorkspace::sharedWorkspace();
        let name = NSString::from_str(app_name);
        let path = workspace.fullPathForApplication(&name)?;
        let path_str = path.to_string();
        let ns_path = NSString::from_str(&path_str);
        let icon = workspace.iconForFile(&ns_path);

        // 设定小尺寸（图标用）
        icon.setSize(std::mem::transmute((32.0, 32.0)));

        // TIFF → PNG via image crate
        let tiff = icon.TIFFRepresentation()?;
        let len = tiff.length();
        let mut buf = vec![0u8; len];
        let ptr = buf.as_mut_ptr() as *mut std::ffi::c_void;
        tiff.getBytes_length(std::mem::transmute(ptr), len);
        let img = image::load_from_memory_with_format(&buf, image::ImageFormat::Tiff).ok()?;
        let mut png_buf = std::io::Cursor::new(Vec::new());
        img.write_to(&mut png_buf, image::ImageFormat::Png).ok()?;
        Some(base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            png_buf.into_inner(),
        ))
    }
}

#[cfg(not(target_os = "macos"))]
fn app_icon_base64(_app_name: &str) -> Option<String> {
    None
}

const MAX_HISTORY: usize = 1000;
/// 自动清理默认天数;0 表示关闭
const DEFAULT_AUTO_CLEAN_DAYS: i64 = 30;

#[derive(Serialize, Clone)]
struct ClipboardItem {
    id: i64,
    item_type: String,
    content: Option<String>,
    image_path: Option<String>,
    app_source: Option<String>,
    name: Option<String>,
    favorite: i64,
    group_id: Option<i64>,
    created_at: i64,
}

#[derive(Serialize, Clone)]
struct Group {
    id: i64,
    name: String,
    color: String,
    sort: i64,
}

#[derive(Serialize, Clone)]
struct AppSettings {
    theme: String,        // "system" | "light" | "dark"
    auto_clean_days: i64, // 0 = 关闭;1 / 7 / 30
}

/// 用于抑制「程序写回剪贴板后被监听线程重复入库」
#[derive(Clone, Default)]
struct Suppress {
    text: Arc<Mutex<Option<String>>>,
    img: Arc<Mutex<Option<u64>>>,
}

#[derive(Clone)]
struct Db {
    conn: Arc<Mutex<Connection>>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn days_to_ms(days: i64) -> i64 {
    days * 24 * 3600 * 1000
}

fn image_hash(img: &arboard::ImageData) -> u64 {
    let mut h = DefaultHasher::new();
    img.width.hash(&mut h);
    img.height.hash(&mut h);
    img.bytes.hash(&mut h);
    h.finish()
}

fn save_image_png(img: &arboard::ImageData, path: &std::path::Path) -> bool {
    match image::RgbaImage::from_raw(img.width as u32, img.height as u32, img.bytes.to_vec()) {
        Some(rgba) => image::DynamicImage::ImageRgba8(rgba).save(path).is_ok(),
        None => false,
    }
}

fn decode_png(path: &str) -> Result<arboard::ImageData<'_>, Box<dyn std::error::Error>> {
    let img = image::open(path)?.to_rgba8();
    let (w, h) = (img.width(), img.height());
    Ok(arboard::ImageData {
        width: w as usize,
        height: h as usize,
        bytes: img.into_raw().into(),
    })
}

fn row_to_item(row: &rusqlite::Row) -> Result<ClipboardItem, rusqlite::Error> {
    Ok(ClipboardItem {
        id: row.get(0)?,
        item_type: row.get(1)?,
        content: row.get(2)?,
        image_path: row.get(3)?,
        app_source: row.get(4)?,
        name: row.get(5)?,
        favorite: row.get(6)?,
        group_id: row.get(7)?,
        created_at: row.get(8)?,
    })
}

fn row_to_group(row: &rusqlite::Row) -> Result<Group, rusqlite::Error> {
    Ok(Group {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        sort: row.get(3)?,
    })
}

fn read_setting(conn: &Connection, key: &str, default: &str) -> String {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |r| r.get(0),
    )
    .unwrap_or_else(|_| default.to_string())
}

fn trim_history(conn: &Connection) {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM items", [], |r| r.get(0))
        .unwrap_or(0);
    if count as usize > MAX_HISTORY {
        let excess = count - MAX_HISTORY as i64;
        // 只清理非收藏的最旧条目，收藏项不受 MAX_HISTORY 限制
        let paths: Vec<Option<String>> = conn
            .prepare(
                "SELECT image_path FROM items WHERE favorite = 0 ORDER BY created_at ASC LIMIT ?1",
            )
            .unwrap()
            .query_map(params![excess], |r| r.get(0))
            .unwrap()
            .filter_map(|x| x.ok())
            .collect();
        for p in paths.into_iter().flatten() {
            let _ = std::fs::remove_file(p);
        }
        conn.execute(
            "DELETE FROM items WHERE id IN (SELECT id FROM items WHERE favorite = 0 ORDER BY created_at ASC LIMIT ?1)",
            params![excess],
        )
        .ok();
    }
}

/// 按设置清理超过 N 天且未收藏的条目
fn cleanup_old(conn: &Connection, days: i64) {
    if days <= 0 {
        return;
    }
    let cutoff = now_ms() - days_to_ms(days);
    let paths: Vec<Option<String>> = conn
        .prepare("SELECT image_path FROM items WHERE favorite = 0 AND created_at < ?1")
        .unwrap()
        .query_map(params![cutoff], |r| r.get(0))
        .unwrap()
        .filter_map(|x| x.ok())
        .collect();
    for p in paths.into_iter().flatten() {
        let _ = std::fs::remove_file(p);
    }
    conn.execute(
        "DELETE FROM items WHERE favorite = 0 AND created_at < ?1",
        params![cutoff],
    )
    .ok();
}

fn init_store(app: &AppHandle) -> Db {
    let dir = app.path().app_data_dir().expect("app data dir");
    std::fs::create_dir_all(&dir).ok();
    let images_dir = dir.join("images");
    std::fs::create_dir_all(&images_dir).ok();
    let db_path = dir.join("pinpaste.db");
    let conn = Connection::open(&db_path).expect("open db");
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_type TEXT NOT NULL,
            content TEXT,
            image_path TEXT,
            app_source TEXT,
            name TEXT,
            favorite INTEGER NOT NULL DEFAULT 0,
            group_id INTEGER,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#3b82f6',
            sort INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_clean_days', '30');
        CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC);",
    )
    .expect("migrate");
    // 按当前设置执行一次自动清理
    let days: i64 = read_setting(&conn, "auto_clean_days", "30")
        .parse()
        .unwrap_or(DEFAULT_AUTO_CLEAN_DAYS);
    cleanup_old(&conn, days);
    Db {
        conn: Arc::new(Mutex::new(conn)),
    }
}

fn insert_text(db: &Db, text: &str, app_source: Option<String>) -> ClipboardItem {
    let conn = db.conn.lock().unwrap();
    let created = now_ms();

    // 去重：如果已有相同内容的条目（不管收藏状态），更新其来源和时间到最新，不新增
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM items WHERE content = ?1 ORDER BY created_at DESC LIMIT 1",
            params![text],
            |r| r.get(0),
        )
        .ok();

    if let Some(id) = existing {
        conn.execute(
            "UPDATE items SET app_source = ?1, created_at = ?2 WHERE id = ?3",
            params![app_source, created, id],
        )
        .unwrap();
        return ClipboardItem {
            id,
            item_type: "text".into(),
            content: Some(text.to_string()),
            image_path: None,
            app_source,
            name: None,
            favorite: 0,
            group_id: None,
            created_at: created,
        };
    }

    conn.execute(
        "INSERT INTO items (item_type, content, app_source, created_at) VALUES ('text', ?1, ?2, ?3)",
        params![text, app_source, created],
    )
    .unwrap();
    let id = conn.last_insert_rowid();
    trim_history(&conn);
    ClipboardItem {
        id,
        item_type: "text".into(),
        content: Some(text.to_string()),
        image_path: None,
        app_source,
        name: None,
        favorite: 0,
        group_id: None,
        created_at: created,
    }
}

fn insert_image(app: &AppHandle, db: &Db, img: &arboard::ImageData, app_source: Option<String>) -> ClipboardItem {
    let dir = app.path().app_data_dir().unwrap().join("images");
    let created = now_ms();
    let path = dir.join(format!("{}.png", created));
    save_image_png(img, &path);
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO items (item_type, image_path, app_source, created_at) VALUES ('image', ?1, ?2, ?3)",
        params![path.to_string_lossy().to_string(), app_source, created],
    )
    .unwrap();
    let id = conn.last_insert_rowid();
    trim_history(&conn);
    ClipboardItem {
        id,
        item_type: "image".into(),
        content: None,
        image_path: Some(path.to_string_lossy().to_string()),
        app_source,
        name: None,
        favorite: 0,
        group_id: None,
        created_at: created,
    }
}

fn start_monitor(app: AppHandle, db: Db, suppress: Suppress) {
    std::thread::spawn(move || {
        let mut board = match Arboard::new() {
            Ok(b) => b,
            Err(_) => return,
        };
        let mut last_text: Option<String> = None;
        let mut last_image_hash: Option<u64> = None;
        loop {
            let mut stored = false;
            if let Ok(img) = board.get_image() {
                let h = image_hash(&img);
                let suppressed = suppress
                    .img
                    .lock()
                    .unwrap()
                    .take()
                    .map(|s| s == h)
                    .unwrap_or(false);
                if !suppressed && Some(h) != last_image_hash {
                    last_image_hash = Some(h);
                    // 捕获当前前台 App 作为来源，过滤 PinPaste 自身
                    let app_source = active_app_name();
                    if app_source.as_deref() == Some("PinPaste") || app_source.as_deref() == Some("pinpaste") {
                        continue;
                    }
                    let item = insert_image(&app, &db, &img, app_source);
                    let _ = app.emit("clipboard-new", &item);
                    stored = true;
                } else {
                    last_image_hash = Some(h);
                }
            }
            if !stored {
                if let Ok(text) = board.get_text() {
                    let t = text.trim().to_string();
                    let suppressed = suppress
                        .text
                        .lock()
                        .unwrap()
                        .take()
                        .map(|s| s == t)
                        .unwrap_or(false);
                    if !suppressed && !t.is_empty() && Some(&t) != last_text.as_ref() {
                        last_text = Some(t.clone());
                        // 捕获当前前台 App 作为来源，过滤 PinPaste 自身
                        let app_source = active_app_name();
                        if app_source.as_deref() == Some("PinPaste") || app_source.as_deref() == Some("pinpaste") {
                            continue;
                        }
                        let item = insert_text(&db, &t, app_source);
                        let _ = app.emit("clipboard-new", &item);
                    } else {
                        last_text = Some(t);
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(700));
        }
    });
}

#[tauri::command]
fn get_items(
    limit: Option<i64>,
    search: Option<String>,
    group_id: Option<i64>,
    favorite: Option<i64>,
    app_source: Option<String>,
    db: State<Db>,
) -> Vec<ClipboardItem> {
    let conn = db.conn.lock().unwrap();
    let mut sql = String::from(
        "SELECT id, item_type, content, image_path, app_source, name, favorite, group_id, created_at FROM items",
    );
    let mut conds: Vec<String> = vec![];
    let mut binds: Vec<Box<dyn rusqlite::ToSql>> = vec![];
    if let Some(g) = group_id {
        conds.push("group_id = ?".into());
        binds.push(Box::new(g));
    }
    if let Some(f) = favorite {
        conds.push("favorite = ?".into());
        binds.push(Box::new(f));
    }
    if let Some(s) = &search {
        if !s.is_empty() {
            conds.push("(content LIKE ? OR name LIKE ?)".into());
            binds.push(Box::new(format!("%{}%", s)));
            binds.push(Box::new(format!("%{}%", s)));
        }
    }
    if let Some(a) = app_source {
        if !a.is_empty() {
            conds.push("app_source = ?".into());
            binds.push(Box::new(a));
        }
    }
    if !conds.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conds.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ?");
    let lim = limit.unwrap_or(500);
    binds.push(Box::new(lim));
    let param_refs: Vec<&dyn rusqlite::ToSql> = binds.iter().map(|b| b.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).unwrap();
    let mut rows = stmt.query(param_refs.as_slice()).unwrap();
    let mut out = vec![];
    while let Some(row) = rows.next().unwrap() {
        out.push(row_to_item(row).unwrap());
    }
    out
}

#[tauri::command]
fn get_groups(db: State<Db>) -> Vec<Group> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, color, sort FROM groups ORDER BY sort, id")
        .unwrap();
    let mut rows = stmt.query([]).unwrap();
    let mut out = vec![];
    while let Some(row) = rows.next().unwrap() {
        out.push(row_to_group(row).unwrap());
    }
    out
}

#[tauri::command]
fn get_app_sources(db: State<Db>) -> Vec<String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT app_source FROM items WHERE app_source IS NOT NULL AND app_source != '' ORDER BY app_source",
        )
        .unwrap();
    let rows = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .unwrap();
    rows.filter_map(|r| r.ok()).collect()
}

/// 返回当前前台（活跃）App 名称，供前端做「当前使用 App」一键绑定。
#[tauri::command]
fn get_active_app() -> Option<String> {
    active_app_name()
}

/// 返回指定 App 的图标（PNG base64），前端用 data URI 显示。
#[tauri::command]
fn get_app_icon(app_name: String) -> Option<String> {
    app_icon_base64(&app_name)
}

use std::collections::HashMap;
use std::sync::Mutex as StdMutex;

static ICON_CACHE: StdMutex<Option<HashMap<String, Option<String>>>> = StdMutex::new(None);

/// 批量获取多个 App 的图标，返回 {app_name: base64_or_null} map。
/// 内部带缓存，同一 app_name 只计算一次。
#[tauri::command]
fn get_app_icons(app_names: Vec<String>) -> HashMap<String, Option<String>> {
    let mut cache_guard = ICON_CACHE.lock().unwrap();
    let cache = cache_guard.get_or_insert_with(HashMap::new);
    let mut result = HashMap::new();
    for name in app_names {
        if let Some(cached) = cache.get(&name) {
            result.insert(name, cached.clone());
        } else {
            let icon = app_icon_base64(&name);
            cache.insert(name.clone(), icon.clone());
            result.insert(name, icon);
        }
    }
    result
}

#[tauri::command]
fn create_group(name: String, color: Option<String>, db: State<Db>) -> Group {
    let conn = db.conn.lock().unwrap();
    let color = color.unwrap_or_else(|| "#3b82f6".into());
    let sort: i64 = conn
        .query_row("SELECT COALESCE(MAX(sort),0)+1 FROM groups", [], |r| r.get(0))
        .unwrap_or(1);
    conn.execute(
        "INSERT INTO groups (name, color, sort) VALUES (?1, ?2, ?3)",
        params![name, color, sort],
    )
    .unwrap();
    let id = conn.last_insert_rowid();
    Group {
        id,
        name,
        color,
        sort,
    }
}

#[tauri::command]
fn update_group(
    id: i64,
    name: Option<String>,
    color: Option<String>,
    db: State<Db>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(n) = name {
        conn.execute("UPDATE groups SET name = ?1 WHERE id = ?2", params![n, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(c) = color {
        conn.execute("UPDATE groups SET color = ?1 WHERE id = ?2", params![c, id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn delete_group(id: i64, db: State<Db>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    // 把该分组的条目移出分组
    conn.execute("UPDATE items SET group_id = NULL WHERE group_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM groups WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_settings(db: State<Db>) -> AppSettings {
    let conn = db.conn.lock().unwrap();
    let theme = read_setting(&conn, "theme", "system");
    let days: i64 = read_setting(&conn, "auto_clean_days", "30")
        .parse()
        .unwrap_or(DEFAULT_AUTO_CLEAN_DAYS);
    AppSettings {
        theme,
        auto_clean_days: days,
    }
}

#[tauri::command]
fn save_settings(
    theme: Option<String>,
    auto_clean_days: Option<i64>,
    db: State<Db>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(t) = theme {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('theme', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![t],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(d) = auto_clean_days {
        let ds = d.to_string();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('auto_clean_days', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![ds],
        )
        .map_err(|e| e.to_string())?;
        // 设置变更后立即执行一次清理
        cleanup_old(&conn, d);
    }
    Ok(())
}

#[tauri::command]
fn get_image_data(id: i64, db: State<Db>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    let path: Option<String> = conn
        .query_row("SELECT image_path FROM items WHERE id = ?1", params![id], |r| {
            r.get(0)
        })
        .ok()
        .flatten();
    if let Some(p) = path {
        let bytes = std::fs::read(&p).map_err(|e| e.to_string())?;
        let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Ok(format!("data:image/png;base64,{}", encoded))
    } else {
        Err("no image".into())
    }
}

#[tauri::command]
fn delete_item(id: i64, db: State<Db>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    let path: Option<String> = conn
        .query_row("SELECT image_path FROM items WHERE id = ?1", params![id], |r| {
            r.get(0)
        })
        .ok()
        .flatten();
    conn.execute("DELETE FROM items WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    // 只在没有其他记录引用同一图片文件时才删除物理文件
    if let Some(p) = &path {
        let refs: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE image_path = ?1",
                params![p],
                |r| r.get(0),
            )
            .unwrap_or(0);
        if refs == 0 {
            let _ = std::fs::remove_file(p);
        }
    }
    Ok(())
}

#[tauri::command]
fn update_item(
    id: i64,
    name: Option<String>,
    content: Option<String>,
    favorite: Option<i64>,
    group_id: Option<i64>,
    db: State<Db>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(n) = name {
        conn.execute("UPDATE items SET name = ?1 WHERE id = ?2", params![n, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(c) = content {
        conn.execute("UPDATE items SET content = ?1 WHERE id = ?2", params![c, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(f) = favorite {
        conn.execute("UPDATE items SET favorite = ?1 WHERE id = ?2", params![f, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(g) = group_id {
        conn.execute("UPDATE items SET group_id = ?1 WHERE id = ?2", params![g, id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 把内容写回系统剪贴板,并登记抑制标记,避免监听线程重复入库
fn set_clipboard_with_suppress(
    text: Option<&str>,
    image_path: Option<&str>,
    suppress: &Suppress,
) -> Result<(), String> {
    let mut board = Arboard::new().map_err(|e| e.to_string())?;
    if let Some(p) = image_path {
        let img = decode_png(p).map_err(|e| e.to_string())?;
        let h = image_hash(&img);
        *suppress.img.lock().unwrap() = Some(h);
        board.set_image(img).map_err(|e| e.to_string())?;
    } else {
        let t = text.unwrap_or_default();
        *suppress.text.lock().unwrap() = Some(t.to_string());
        board.set_text(t).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 读取单条条目的类型 / 文本 / 图片路径（copy_item 与 paste_item 共用）
fn fetch_item_content(db: &Db, id: i64) -> Option<(String, Option<String>, Option<String>)> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT item_type, content, image_path FROM items WHERE id = ?1")
        .ok()?;
    let mut rows = stmt.query(params![id]).ok()?;
    let row = rows.next().ok()??;
    Some((
        row.get::<_, String>(0).ok()?,
        row.get::<_, Option<String>>(1).ok().flatten(),
        row.get::<_, Option<String>>(2).ok().flatten(),
    ))
}

/// 收藏：基于原条目复制一条新记录（favorite=1），原记录保持 favorite=0 不变。
/// 这样自动剪切列表的来源信息不会被覆盖，收藏列表独立管理。
#[tauri::command]
fn favorite_item(id: i64, db: State<Db>) -> Result<ClipboardItem, String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("UPDATE items SET favorite = 1 WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    let row = conn
        .query_row(
            "SELECT id, item_type, content, image_path, app_source, name, favorite, group_id, created_at FROM items WHERE id = ?1",
            params![id],
            |r| row_to_item(r),
        )
        .map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
fn unfavorite_item(id: i64, db: State<Db>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("UPDATE items SET favorite = 0 WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn copy_item(id: i64, db: State<Db>, suppress: State<Suppress>) -> Result<(), String> {
    let (item_type, content, image_path) = fetch_item_content(&db, id).ok_or("not found")?;
    if item_type == "image" {
        set_clipboard_with_suppress(None, image_path.as_deref(), &suppress)
    } else {
        set_clipboard_with_suppress(content.as_deref(), None, &suppress)
    }
}

#[tauri::command]
fn paste_item(app: AppHandle, id: i64, db: State<Db>, suppress: State<Suppress>) -> Result<(), String> {
    // 1. 读取条目内容
    let (item_type, content, image_path) = fetch_item_content(&db, id).ok_or("not found")?;
    // 2. 写入系统剪贴板(登记抑制)
    if item_type == "image" {
        set_clipboard_with_suppress(None, image_path.as_deref(), &suppress)?;
    } else {
        set_clipboard_with_suppress(content.as_deref(), None, &suppress)?;
    }
    // 3. 隐藏主窗口,让焦点回到目标应用
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
    // 4. 模拟粘贴:mac = Cmd+V,其它平台 = Ctrl+V
    std::thread::sleep(std::time::Duration::from_millis(80));
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;
    enigo
        .key(modifier, Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(modifier, Direction::Release)
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 隐藏主窗口(供前端在失焦 / Esc 时调用,避免前端直接操作 window 权限)
#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 切换窗口置顶状态，返回切换后是否置顶
#[tauri::command]
fn toggle_pin(app: AppHandle) -> Result<bool, String> {
    if let Some(w) = app.get_webview_window("main") {
        let current = w.is_always_on_top().unwrap_or(false);
        let next = !current;
        w.set_always_on_top(next).map_err(|e| e.to_string())?;
        if next {
            // 置顶时同时抢焦点，确保立即浮到最前面
            w.set_focus().map_err(|e| e.to_string())?;
        let _ = w.set_title("PinPaste");
        }
        Ok(next)
    } else {
        Err("main window not found".into())
    }
}

/// 显示并聚焦主窗口（统一封装，避免各处重复）
fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// 主窗口显隐切换，返回切换后是否可见（供快捷键 / 托盘点击复用）
fn toggle_main(app: &AppHandle) -> bool {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
            false
        } else {
            show_main(app);
            true
        }
    } else {
        false
    }
}

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["cmd+shift+v"])
                .expect("register global shortcut")
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if toggle_main(app) {
                            let _ = app.emit("palette-show", ());
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();
            let db = init_store(&handle);
            let suppress = Suppress::default();
            app.manage(db.clone());
            app.manage(suppress.clone());
            // 系统托盘(菜单栏常驻)
            let show_i = MenuItem::with_id(app, "show", "Show PinPaste", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit PinPaste", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => show_main(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        toggle_main(tray.app_handle());
                    }
                })
                .build(app)?;
            // 启动剪贴板监听
            let db_for_monitor = app.state::<Db>().inner().clone();
            let suppress_for_monitor = app.state::<Suppress>().inner().clone();
            start_monitor(handle, db_for_monitor, suppress_for_monitor);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_items,
            get_groups,
            get_app_sources,
            get_active_app,
            get_app_icon,
            get_app_icons,
            create_group,
            update_group,
            delete_group,
            get_settings,
            save_settings,
            get_image_data,
            delete_item,
            update_item,
            favorite_item,
            unfavorite_item,
            copy_item,
            paste_item,
            hide_main_window,
            toggle_pin,
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");
    // panic 安全网：只注册一次（放在事件循环外），崩溃时把窗口亮出来便于排查
    let handle = app.handle().clone();
    std::panic::set_hook(Box::new(move |_| {
        let _ = handle.get_webview_window("main").map(|w| {
            let _ = w.show();
            let _ = w.set_focus();
        });
    }));
    app.run(|app_handle, event| {
        if let RunEvent::Reopen { .. } = event {
            show_main(app_handle);
        }
    });
}
