/**
 * Report view (§10, §13 MVP: view report). Renders the HTML report from the
 * Reporting MCP. `dangerouslySetInnerHTML` is acceptable here because the report
 * HTML is generated server-side from confirmed findings, not user input.
 */
export function ReportView({ html, loading }: { html: string | null; loading?: boolean }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Report</h2>
      </div>
      <div className="panel-body scroll">
        {loading ? (
          <p className="empty">Compiling report…</p>
        ) : html ? (
          <div className="report" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="empty">The report appears here once the scan completes.</p>
        )}
      </div>
    </div>
  );
}
