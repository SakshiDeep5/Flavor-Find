function StatusMessage({ isLoading, status, error }) {
  return (
    <div className="status-row" aria-live="polite" aria-atomic="true">
      {isLoading ? <p className="status loading">Loading...</p> : null}
      {!isLoading && status ? <p className="status">{status}</p> : null}
      {error ? (
        <p className="status error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default StatusMessage;