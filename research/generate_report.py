#!/usr/bin/env python3
"""
Argentus PDF Report Generator
Full data dump, clean structure, no truncation
Usage: python3 generate_report.py <deliverable.json> <output_dir>
"""
import json, sys, os, subprocess, tempfile
from datetime import datetime

def extract_report(data):
    r = data.get('report', {})
    if isinstance(r, str):
        try: r = json.loads(r)
        except: r = {'executive_summary': r}
    return r

def signal_icon(signal):
    s = str(signal).lower()
    if 'bull' in s: return '🟢 BULLISH'
    if 'bear' in s: return '🔴 BEARISH'
    return '🟡 NEUTRAL'

def clean_text(text):
    """Clean text for markdown - preserve structure"""
    if not text: return ''
    return str(text).strip()

def build_summary_md(data, r):
    topic = r.get('topic', data.get('goal', 'Intelligence Report'))
    signal = r.get('smart_money_signal', 'N/A')
    confidence = int(r.get('confidence_score', 0) * 100)
    generated = r.get('generated_at', '')[:19]
    cid = data.get('cid', 'N/A')
    duration = round(data.get('duration_ms', 0) / 1000)
    caps = ', '.join(data.get('plan', {}).get('capabilities_run', ['onchain']))

    lines = []
    lines.append(f'# {topic}')
    lines.append(f'\n**Argentus Intelligence Network** · {generated} UTC\n')
    lines.append('---')
    lines.append('')

    # Key metrics table
    lines.append('| | |')
    lines.append('|:--|:--|')
    lines.append(f'| **Signal** | {signal_icon(signal)} |')
    lines.append(f'| **Confidence** | {confidence}% |')
    lines.append(f'| **Capabilities** | {caps} |')
    lines.append(f'| **Duration** | {duration}s |')
    lines.append(f'| **Generated** | {generated} UTC |')
    lines.append('')

    # Executive summary
    lines.append('## Executive Summary')
    lines.append('')
    lines.append(clean_text(r.get('executive_summary', 'N/A')))
    lines.append('')

    # Key findings
    findings = r.get('key_findings', [])
    if findings:
        lines.append('## Key Findings')
        lines.append('')
        for i, f in enumerate(findings, 1):
            lines.append(f'{i}. {clean_text(f)}')
            lines.append('')

    # Risk flags
    risks = r.get('risks', [])
    if risks:
        lines.append('## Risk Flags')
        lines.append('')
        for risk in risks:
            lines.append(f'- {clean_text(risk)}')
        lines.append('')

    # Token signals
    tokens = r.get('key_tokens', [])
    if tokens:
        lines.append('## Token Signals')
        lines.append('')
        lines.append('| Symbol | Signal | Risk | Thesis |')
        lines.append('|:--|:--|:--|:--|')
        for t in tokens:
            if isinstance(t, dict):
                lines.append(f'| **{t.get("symbol","?")}** | {t.get("sentiment","?")} | {t.get("risk_level","?")} | {clean_text(t.get("thesis",""))} |')
        lines.append('')

    # On-chain record
    lines.append('---')
    lines.append('')
    lines.append('## On-Chain Record')
    lines.append('')
    lines.append(f'**CID:** `{cid}`')
    lines.append('')
    lines.append(f'**IPFS:** <https://ipfs.io/ipfs/{cid}>')
    lines.append('')
    if data.get('arbitrateTx'):
        lines.append(f'**Arbitrate:** `{data["arbitrateTx"]}`')
        lines.append('')
    if data.get('collectTx'):
        lines.append(f'**Collect:** `{data["collectTx"]}`')
        lines.append('')
    lines.append('> Stored on Filecoin Mainnet. Arbitrated on Base Sepolia via Alkahest TrustedOracleArbiter.')

    return '\n'.join(lines)

def build_report_md(data, r):
    topic = r.get('topic', data.get('goal', 'Intelligence Report'))
    signal = r.get('smart_money_signal', 'N/A')
    confidence = int(r.get('confidence_score', 0) * 100)
    generated = r.get('generated_at', '')[:19]
    cid = data.get('cid', 'N/A')
    duration = round(data.get('duration_ms', 0) / 1000)
    caps = ', '.join(data.get('plan', {}).get('capabilities_run', ['onchain']))
    session = data.get('sessionId', 'N/A')

    lines = []
    lines.append(f'# {topic}')
    lines.append(f'\n**Argentus Intelligence Network** · Full Intelligence Report · {generated} UTC\n')
    lines.append('---')
    lines.append('')

    # Metadata
    lines.append('| Field | Value |')
    lines.append('|:--|:--|')
    lines.append(f'| **Signal** | {signal_icon(signal)} |')
    lines.append(f'| **Confidence** | {confidence}% |')
    lines.append(f'| **Type** | {r.get("type","research").replace("_"," ").upper()} |')
    lines.append(f'| **Capabilities** | {caps} |')
    lines.append(f'| **Session ID** | `{session}` |')
    lines.append(f'| **Generated** | {generated} UTC |')
    lines.append(f'| **Duration** | {duration}s |')
    lines.append('')

    # 1. Executive Summary
    lines.append('## 1. Executive Summary')
    lines.append('')
    lines.append(clean_text(r.get('executive_summary', 'N/A')))
    lines.append('')

    # 2. Market Narrative
    narrative = r.get('market_narrative', '')
    if narrative:
        lines.append('## 2. Market Narrative')
        lines.append('')
        # Split into readable paragraphs at sentence boundaries
        text = clean_text(narrative)
        # Every ~3 sentences = new paragraph
        sentences = []
        current = ''
        for char in text:
            current += char
            if char == '.' and len(current) > 150:
                sentences.append(current.strip())
                current = ''
        if current.strip():
            sentences.append(current.strip())
        
        para = []
        for i, s in enumerate(sentences):
            para.append(s)
            if len(para) == 3 or i == len(sentences) - 1:
                lines.append(' '.join(para))
                lines.append('')
                para = []

    # 3. Key Findings
    findings = r.get('key_findings', [])
    if findings:
        lines.append('## 3. Key Findings')
        lines.append('')
        for i, f in enumerate(findings, 1):
            lines.append(f'**{i}.** {clean_text(f)}')
            lines.append('')

    # 4. Token Thesis
    tokens = r.get('key_tokens', [])
    if tokens:
        lines.append('## 4. Token Thesis')
        lines.append('')
        for t in tokens:
            if isinstance(t, dict):
                sym = t.get('symbol', '?')
                sent = t.get('sentiment', 'neutral')
                risk = t.get('risk_level', 'medium')
                thesis = clean_text(t.get('thesis', ''))
                lines.append(f'### {sym}')
                lines.append('')
                lines.append(f'**Signal:** {sent.upper()} · **Risk:** {risk.upper()}')
                lines.append('')
                if thesis:
                    lines.append(thesis)
                    lines.append('')

    # 5. Risk Flags
    risks = r.get('risks', [])
    if risks:
        lines.append('## 5. Risk Flags')
        lines.append('')
        for risk in risks:
            lines.append(f'- {clean_text(risk)}')
        lines.append('')

    # 6. Smart Money Signal
    lines.append('## 6. Smart Money Signal')
    lines.append('')
    lines.append(f'**Net Signal:** {signal_icon(signal)}')
    lines.append('')
    lines.append(f'**Confidence Score:** {confidence}%')
    lines.append('')

    # 7. Data Sources
    sources = r.get('data_sources', [])
    if sources:
        lines.append('## 7. Data Sources')
        lines.append('')
        for s in sources:
            lines.append(f'- {clean_text(s)}')
        lines.append('')

    # 8. Full Research Output (clean, structured)
    results = data.get('results', [])
    if results:
        lines.append('## 8. Research Capability Output')
        lines.append('')

        # Pipeline summary table
        lines.append('| Capability | Status | Duration |')
        lines.append('|:--|:--|:--|')
        for result in results:
            cap = result.get('capability', 'unknown').title()
            success = '✅ Success' if result.get('success') else '❌ Failed'
            dur = f"{round(result.get('duration_ms', 0) / 1000)}s"
            lines.append(f'| {cap} | {success} | {dur} |')
        lines.append('')

        # Full output per capability
        for result in results:
            cap = result.get('capability', 'unknown').title()
            success = '✅' if result.get('success') else '❌'
            dur = round(result.get('duration_ms', 0) / 1000)
            lines.append(f'### {cap} Capability {success} — {dur}s')
            lines.append('')

            raw_data = result.get('data', {})
            if not isinstance(raw_data, dict):
                lines.append(str(raw_data))
                lines.append('')
                continue

            # Analysis text — full, no truncation
            analysis = raw_data.get('analysis', '')
            if analysis and isinstance(analysis, str):
                lines.append('**Analysis:**')
                lines.append('')
                # Clean up markdown artifacts but keep full content
                analysis_clean = analysis.strip()
                lines.append(analysis_clean)
                lines.append('')

            # Executive summary from capability
            exec_sum = raw_data.get('executive_summary', '')
            if exec_sum and isinstance(exec_sum, str) and exec_sum != r.get('executive_summary'):
                lines.append('**Capability Summary:**')
                lines.append('')
                lines.append(clean_text(exec_sum))
                lines.append('')

            # Key metrics/findings from capability
            cap_findings = raw_data.get('key_findings', raw_data.get('findings', []))
            if cap_findings and isinstance(cap_findings, list):
                lines.append('**Findings:**')
                lines.append('')
                for i, f in enumerate(cap_findings, 1):
                    if isinstance(f, dict):
                        lines.append(f'- **{f.get("insight","?")}**: {f.get("evidence","")}')
                    else:
                        lines.append(f'{i}. {clean_text(str(f))}')
                lines.append('')

            # Profile data
            profile = raw_data.get('profile', {})
            if profile and isinstance(profile, dict) and any(v for v in profile.values() if v):
                lines.append('**Token Profile:**')
                lines.append('')
                lines.append('| Field | Value |')
                lines.append('|:--|:--|')
                for k, v in profile.items():
                    if v is not None and v != [] and v != {}:
                        val = json.dumps(v) if isinstance(v, (dict, list)) else str(v)
                        if len(val) < 200:  # Skip massive nested objects
                            lines.append(f'| {k} | {val} |')
                lines.append('')

            # Metadata fields
            meta_fields = ['type', 'company', 'topic', 'run_at']
            meta = {k: raw_data[k] for k in meta_fields if k in raw_data}
            if meta:
                lines.append('**Metadata:**')
                lines.append('')
                for k, v in meta.items():
                    lines.append(f'- **{k}:** {v}')
                lines.append('')

    # 9. On-Chain Verification
    lines.append('---')
    lines.append('')
    lines.append('## 9. On-Chain Verification')
    lines.append('')
    lines.append('| Field | Value |')
    lines.append('|:--|:--|')
    lines.append(f'| **IPFS CID** | `{cid}` |')
    lines.append(f'| **IPFS URL** | <https://ipfs.io/ipfs/{cid}> |')
    lines.append(f'| **Session ID** | `{session}` |')
    lines.append(f'| **Escrow UID** | `{data.get("escrowUID","N/A")}` |')
    lines.append(f'| **Fulfillment UID** | `{data.get("fulfillmentUID","N/A")}` |')
    if data.get('arbitrateTx'):
        lines.append(f'| **Arbitrate Tx** | `{data["arbitrateTx"]}` |')
    if data.get('collectTx'):
        lines.append(f'| **Collect Tx** | `{data["collectTx"]}` |')
    lines.append('')
    lines.append('> Stored on Filecoin Mainnet. Arbitrated on Base Sepolia via Alkahest TrustedOracleArbiter.')

    return '\n'.join(lines)

def md_to_pdf(md_content, output_path):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        f.write(md_content)
        tmp = f.name
    try:
        result = subprocess.run([
            'pandoc', tmp, '-o', output_path,
            '--pdf-engine=wkhtmltopdf',
            '-V', 'margin-top=15mm',
            '-V', 'margin-bottom=15mm',
            '-V', 'margin-left=15mm',
            '-V', 'margin-right=15mm',
            '-V', 'font-size=11pt',
            '-V', 'papersize=a4',
            '-V', 'linestretch=1.4',
        ], capture_output=True, text=True)
        if result.returncode == 0:
            print(f'✅ {output_path}')
            return True
        else:
            print(f'❌ {result.stderr[:200]}')
            return False
    finally:
        os.unlink(tmp)

def main():
    if len(sys.argv) < 3:
        print('Usage: python3 generate_report.py <deliverable.json> <output_dir>')
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    r = extract_report(data)
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M')

    md_to_pdf(build_summary_md(data, r), f'{out_dir}/summary_{ts}.pdf')
    md_to_pdf(build_report_md(data, r), f'{out_dir}/report_{ts}.pdf')

if __name__ == '__main__':
    main()
