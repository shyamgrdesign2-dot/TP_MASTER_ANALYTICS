import { useEffect, useState } from "react";
import { RichEditor } from "./RichEditor";
import styles from "./SoapNoteCard.module.scss";

function ShimmerBlock() {
	return (
		<div className={styles.shimmerWrap}>
			<div className={[styles.shimmerLine, styles.shimmerH].join(" ")} />
			<div className={styles.shimmerLine} />
			<div className={styles.shimmerLine} />
			<div className={[styles.shimmerLine, styles.shimmerShort].join(" ")} />
			<div className={[styles.shimmerLine, styles.shimmerH].join(" ")} />
			<div className={styles.shimmerLine} />
			<div className={[styles.shimmerLine, styles.shimmerShort].join(" ")} />
			<div className={[styles.shimmerLine, styles.shimmerH].join(" ")} />
			<div className={styles.shimmerLine} />
		</div>
	);
}

export function SoapNoteCard({ status, html: htmlProp, error, onRetry, onChange }) {
	const [html, setHtml] = useState(htmlProp || "");

	useEffect(() => {
		if (typeof htmlProp === "string") setHtml(htmlProp);
	}, [htmlProp]);

	const handleChange = (next) => {
		setHtml(next);
		onChange?.(next);
	};

	if (status === "pending") {
		return (
			<div className={styles.root}>
				<ShimmerBlock />
			</div>
		);
	}

	if (status === "rejected") {
		return (
			<div className={styles.root}>
				<div className={styles.errorState}>
					<p className={styles.errorMsg}>{error || "SOAP note could not be generated."}</p>
					{onRetry ? (
						<button type="button" className={styles.retryBtn} onClick={onRetry}>
							Retry
						</button>
					) : null}
				</div>
			</div>
		);
	}

	if (!html) {
		return (
			<div className={styles.root}>
				<div className={styles.errorState}>
					<p className={styles.errorMsg}>No SOAP note available for this visit.</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.root}>
			<RichEditor html={html} onChange={handleChange} placeholder="SOAP note will appear here…" />
		</div>
	);
}
