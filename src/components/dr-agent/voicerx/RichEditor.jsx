import { useEffect, useRef } from "react";
import { Tooltip } from "antd";
import styles from "./RichEditor.module.scss";

function exec(command, value) {
	document.execCommand(command, false, value);
}

const ICON_SIZE = 16;

const H1Icon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" />
		<path d="M17 12l3-2v8" />
	</svg>
);

const H2Icon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" />
		<path d="M17 10a2 2 0 1 1 4 0c0 1.5-2.5 2.8-4 5h4" />
	</svg>
);

const TextIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
	</svg>
);

const BoldIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" />
	</svg>
);

const ItalicIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
	</svg>
);

const ListIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
		<circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" />
	</svg>
);

const OrderedListIcon = () => (
	<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
		<path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
	</svg>
);

export function RichEditor({ html, onChange, placeholder = "Edit notes…" }) {
	const ref = useRef(null);
	const lastHtmlRef = useRef("");
	const isFocusedRef = useRef(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const nextHtml = html ?? "";
		if (!isFocusedRef.current && el.innerHTML !== nextHtml) {
			el.innerHTML = nextHtml;
			lastHtmlRef.current = nextHtml;
		}
	}, [html]);

	function handleInput() {
		const el = ref.current;
		if (!el) return;
		lastHtmlRef.current = el.innerHTML;
		onChange?.(el.innerHTML);
	}

	function applyFormat(command, value) {
		exec(command, value);
		const el = ref.current;
		if (el) {
			lastHtmlRef.current = el.innerHTML;
			onChange?.(el.innerHTML);
		}
	}

	const buttons = [
		{ label: "Heading 1", icon: <H1Icon />, cmd: "formatBlock", value: "H1" },
		{ label: "Heading 2", icon: <H2Icon />, cmd: "formatBlock", value: "H2" },
		{ label: "Paragraph", icon: <TextIcon />, cmd: "formatBlock", value: "P" },
		{ divider: true },
		{ label: "Bold", icon: <BoldIcon />, cmd: "bold" },
		{ label: "Italic", icon: <ItalicIcon />, cmd: "italic" },
		{ divider: true },
		{ label: "Bullet list", icon: <ListIcon />, cmd: "insertUnorderedList" },
		{ label: "Numbered list", icon: <OrderedListIcon />, cmd: "insertOrderedList" }
	];

	return (
		<div className={styles.wrap}>
			<div className={styles.toolbar}>
				{buttons.map((b, i) =>
					b.divider ? (
						<span key={i} className={styles.divider} />
					) : (
						<Tooltip key={i} title={b.label} placement="top">
							<button
								type="button"
								className={styles.toolBtn}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => applyFormat(b.cmd, b.value)}
								aria-label={b.label}>
								{b.icon}
							</button>
						</Tooltip>
					)
				)}
			</div>
			<div
				ref={ref}
				className={styles.editor}
				contentEditable
				suppressContentEditableWarning
				data-placeholder={placeholder}
				onFocus={() => { isFocusedRef.current = true; }}
				onBlur={() => {
					isFocusedRef.current = false;
					const el = ref.current;
					if (!el) return;
					lastHtmlRef.current = el.innerHTML;
					onChange?.(el.innerHTML);
				}}
				onInput={handleInput}
				spellCheck
			/>
		</div>
	);
}
