/** Report view (§10, §13 MVP: view report). Renders the HTML report from the
 *  Reporting MCP. dangerouslySetInnerHTML is acceptable here because the report
 *  HTML is generated server-side from confirmed findings, not user input. */
export function ReportView({ html }: { html: string | null }) {
  if (!html) return <p style={{ opacity: 0.6 }}>Report will appear here when the scan completes.</p>;
  return (
    <div>
      <h2>Report</h2>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
