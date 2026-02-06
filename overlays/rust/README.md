# Rust Overlay

Adds Rust stable toolchain with cargo, rustfmt, clippy, and rust-analyzer for systems programming and high-performance applications.

## Features

- **Rust** - Latest stable version with rustup
- **cargo** - Rust package manager and build tool
- **rustfmt** - Official Rust code formatter
- **clippy** - Rust linter for catching common mistakes
- **rust-analyzer** - Language server for IDE features
- **VS Code Extensions:**
  - rust-analyzer (rust-lang.rust-analyzer) - IntelliSense and code actions
  - CodeLLDB (vadimcn.vscode-lldb) - Native debugger
- **Automatic dependency fetching** - Runs `cargo fetch` on container creation

## How It Works

This overlay uses the official devcontainers Rust feature to install Rust via rustup. The setup script installs essential Rust components (rustfmt, clippy, rust-src) and useful cargo extensions (cargo-watch, cargo-edit).

**Installation method:**
- Rust toolchain via rustup
- Components and tools via `rustup component add` and `cargo install`
- Tools accessible in ~/.cargo/bin

## Common Commands

### Project Initialization

```bash
# Create new binary project
cargo new myapp

# Create new library
cargo new --lib mylib

# Initialize in existing directory
cargo init
```

### Building and Running

```bash
# Build project
cargo build

# Build with optimizations (release mode)
cargo build --release

# Run application
cargo run

# Run with arguments
cargo run -- arg1 arg2

# Check code without building
cargo check
```

### Testing

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run tests with output
cargo test -- --nocapture

# Run benchmarks
cargo bench

# Run with coverage (requires tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin
```

### Code Quality

```bash
# Format code
cargo fmt

# Check formatting without changes
cargo fmt -- --check

# Lint with clippy
cargo clippy

# Clippy with all warnings
cargo clippy -- -W clippy::all

# Fix automatically fixable issues
cargo clippy --fix
```

### Dependency Management

```bash
# Add dependency (requires cargo-edit)
cargo add tokio

# Add dev dependency
cargo add --dev serde

# Remove dependency
cargo rm tokio

# Update dependencies
cargo update

# List dependencies
cargo tree
```

### Watch Mode

```bash
# Auto-rebuild on file changes (requires cargo-watch)
cargo watch -x run

# Run tests on changes
cargo watch -x test

# Run clippy on changes
cargo watch -x clippy
```

## Use Cases

- **Systems programming** - Operating systems, device drivers, embedded systems
- **WebAssembly** - High-performance web applications (wasm-pack)
- **CLI tools** - Fast command-line utilities (clap, structopt)
- **Web servers** - High-performance APIs (Actix, Axum, Rocket)
- **Game engines** - Game development (Bevy, Amethyst)
- **Blockchain** - Cryptocurrency and smart contracts (Substrate, Solana)

**Integrates well with:**
- `postgres`, `redis` - Database drivers (sqlx, deadpool)
- `docker-sock` - Bollard (Docker SDK for Rust)
- `prometheus` - Prometheus Rust client
- `otel-collector` - OpenTelemetry Rust SDK

## Configuration

### Rust Version

The overlay installs **latest stable** Rust. To use nightly:

```bash
# Switch to nightly
rustup default nightly

# Or use nightly for specific project
rustup override set nightly
```

### Cargo Configuration

Create `.cargo/config.toml` in project root:

```toml
[build]
# Use all CPU cores
jobs = 8

[target.x86_64-unknown-linux-gnu]
# Use lld linker for faster builds
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[alias]
# Custom aliases
b = "build"
r = "run"
t = "test"
```

## Application Integration

### Web Server with Axum

**Cargo.toml:**
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
```

**main.rs:**
```rust
use axum::{routing::get, Router};

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { "Hello from Rust!" }));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .unwrap();
    
    axum::serve(listener, app).await.unwrap();
}
```

**Run:**
```bash
cargo run
# Access at http://localhost:8080
```

### PostgreSQL with sqlx

```rust
use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() -> Result<(), sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres:postgres@postgres/mydb")
        .await?;

    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await?;

    println!("User count: {}", row.0);
    Ok(())
}
```

## Troubleshooting

### Issue: rust-analyzer not working

**Symptoms:**
- No IntelliSense
- "rust-analyzer failed to load workspace" error

**Solution:**
```bash
# Install rust-src component
rustup component add rust-src

# Reload VS Code window
# Command Palette -> "Developer: Reload Window"
```

### Issue: Slow compilation times

**Solution:**
```bash
# Use sccache for caching
cargo install sccache
export RUSTC_WRAPPER=sccache

# Use lld linker (faster)
sudo apt-get install lld
# Add to .cargo/config.toml (see Configuration section)
```

### Issue: Cargo.lock conflicts

**Solution:**
```bash
# Update Cargo.lock
cargo update

# Or delete and regenerate
rm Cargo.lock
cargo build
```

## References

- [Official Rust Documentation](https://doc.rust-lang.org/) - The Rust Book and reference
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) - Learn by examples
- [crates.io](https://crates.io/) - Rust package registry
- [rust-analyzer](https://rust-analyzer.github.io/) - Language server
- [Clippy Lints](https://rust-lang.github.io/rust-clippy/) - All clippy lints

**Related Overlays:**
- `postgres` - PostgreSQL with sqlx/diesel
- `redis` - Redis with redis-rs
- `docker-sock` - Bollard Docker SDK
- `prometheus` - Prometheus Rust client
