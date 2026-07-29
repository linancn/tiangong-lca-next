export function embeddingFtPostgresOptions() {
  return {
    // One embedding request processes its batch sequentially. A wider pool only
    // lets separate Edge isolates retain extra database connections.
    max: 1,
    idle_timeout: 20,
    max_lifetime: 300,
    connection: {
      application_name: 'embedding-ft-edge',
    },
  };
}
