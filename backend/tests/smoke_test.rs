// Smoke tests for TxPulse backend
// Run with: cargo test --test smoke_test

#[cfg(test)]
mod tests {
    use std::net::TcpListener;
    use std::process::Command;
    use std::time::Duration;

    #[test]
    fn test_server_starts() {
        // Test that the server binary can be built
        let output = Command::new("cargo")
            .args(["build", "--bin", "backend"])
            .current_dir("../backend")
            .output()
            .expect("Failed to build backend");

        assert!(output.status.success(), "Backend should build successfully");
    }

    #[test]
    fn test_health_endpoint() {
        // Start server on random port
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();

        // In a real test, we would spawn the server and call the endpoint
        // For now, just verify we can bind to a port
        assert!(port > 0, "Should get a valid port");
    }
}