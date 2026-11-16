use std::{
    io::{self, Read},
    path::Path,
};
use trackdraw_desktop::repository::Repository;
fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
fn run() -> Result<(), String> {
    let filename = std::env::args().nth(1).ok_or("Database path is required")?;
    let mut text = String::new();
    io::stdin()
        .take(17 * 1024 * 1024)
        .read_to_string(&mut text)
        .map_err(|e| e.to_string())?;
    let request: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    let mut repository = Repository::open(Path::new(&filename), None)?;
    let result = repository.command(
        request["name"].as_str().ok_or("Command is required")?,
        &request["payload"],
    )?;
    println!(
        "{}",
        serde_json::to_string(&result).map_err(|e| e.to_string())?
    );
    Ok(())
}
