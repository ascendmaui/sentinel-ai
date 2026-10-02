import Link from "next/link";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME } from "../lib/brand";
import { severityLabel, statusLabel } from "../lib/scan/report";
import type { CheckStatus, Finding, Report, Severity } from "../lib/scan/types";

export function ReportView({ report }: { report: Report }) {
  const when = new Date(report.createdAt);
  const stamp = Number.isNaN(when.getTime()) ? report.createdAt : when.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  return (
    <article className="report">
      <header className="cs-head">
        <p className="eyebrow">
          {BRAND_NAME} · {report.tierName} · {report.className}
        </p>
        <h1>
          {report.companyName || report.target.host}
          <br />
          <span className="gold-text">Passive scan report</span>
        </h1>
        <p className="lead">
          Public information only. Failed checks are findings. Pending means the check did not finish. Requires engagement means a person
          would do it under a written scope, and this scan did not.
        </p>
        <dl className="report-meta">
          <div>
            <dt>Target</dt>
            <dd>{report.target.finalUrl || report.target.input}</dd>
          </div>
          <div>
            <dt>Requested</dt>
            <dd>{report.target.input}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>{stamp}</dd>
          </div>
          {report.headerScore !== null ? (
            <div>
              <dt>Header score</dt>
              <dd>{report.headerScore} / 100</dd>
            </div>
          ) : null}
        </dl>
        <ul className="count-row" aria-label="Finding counts">
          <Count n={report.counts.critical} label="Critical" tone="critical" />
          <Count n={report.counts.high} label="High" tone="high" />
          <Count n={report.counts.medium} label="Medium" tone="medium" />
          <Count n={report.counts.low} label="Low" tone="low" />
          <Count n={report.counts.pending} label="Pending" tone="pending" />
          <Count n={report.counts.requiresEngagement} label="Manual" tone="manual" />
        </ul>
      </header>

      <div className="callout">
        <strong>What ran. </strong>
        {report.engine.note} Authorization was affirmed at {report.authorization.affirmedAt}. The statement was: {report.authorization.statement}
      </div>

      {report.sections.map((section) => (
        <section key={section.id} className={section.included ? "report-section" : "report-section is-locked"} aria-labelledby={`${section.id}-h`}>
          <div className="section-head">
            <p className="eyebrow">{section.included ? "Included" : `From ${section.minimumTier}`}</p>
            <h2 id={`${section.id}-h`}>{section.title}</h2>
            <p className="lead">{section.narrative}</p>
          </div>
          <ul className="finding-list">
            {section.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </ul>
        </section>
      ))}

      {report.remediationPlan ? (
        <section className="report-section" aria-labelledby="plan-h">
          <div className="section-head">
            <p className="eyebrow">Full tier</p>
            <h2 id="plan-h">Remediation plan template</h2>
            <p className="lead">Owners are unassigned on purpose. This is a template from the failed checks above, not a completed engagement.</p>
          </div>
          {report.remediationPlan.length === 0 ? (
            <p>No failed automated checks to schedule.</p>
          ) : (
            <ol className="plan-list">
              {report.remediationPlan.map((item) => (
                <li key={item.findingId}>
                  <span className={`sev sev-${item.severity}`}>{severityLabel(item.severity)}</span>
                  <strong>{item.action}</strong>
                  <span className="plan-meta">
                    Owner: {item.owner}. {item.verify}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {report.retestChecklist ? (
        <section className="report-section" aria-labelledby="retest-h">
          <div className="section-head">
            <p className="eyebrow">Full tier</p>
            <h2 id="retest-h">Retest checklist</h2>
            <p className="lead">Use this when someone retests with authorization. This scan does not check the boxes.</p>
          </div>
          <ul className="check-list">
            {report.retestChecklist.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="report-section" aria-labelledby="limits-h">
        <div className="section-head">
          <p className="eyebrow">Limits</p>
          <h2 id="limits-h">What this report is not</h2>
        </div>
        <ul>
          {report.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <div className="cta-band">
        <div>
          <h2>Need a person to go further?</h2>
          <p className="lead">A Scoped Assessment is separate, written, and human. The automated scan stops at the public surface.</p>
        </div>
        <div className="row">
          <Link className="btn btn-gold" href="/pricing#engagements">
            See human tiers
          </Link>
          <a className="btn btn-glass" href={`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20scoped%20assessment`}>
            Request a Scoped Assessment
          </a>
          <Link className="btn btn-glass" href="/scan">
            Run another scan
          </Link>
        </div>
      </div>
    </article>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <li className={`count count-${tone}`}>
      <strong>{n}</strong>
      <span>{label}</span>
    </li>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <li className={`finding finding-${finding.status}`}>
      <div className="finding-top">
        <StatusPill status={finding.status} />
        {finding.status === "fail" ? <SeverityPill severity={finding.severity} /> : null}
        <h3>{finding.title}</h3>
      </div>
      <p>{finding.summary}</p>
      {finding.evidence ? <pre className="evidence">{finding.evidence}</pre> : null}
      {finding.remediation ? (
        <p className="remediation">
          <strong>Remediation. </strong>
          {finding.remediation}
        </p>
      ) : null}
    </li>
  );
}

function StatusPill({ status }: { status: CheckStatus }) {
  return <span className={`pill pill-${status}`}>{statusLabel(status)}</span>;
}

function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={`sev sev-${severity}`}>{severityLabel(severity)}</span>;
}
