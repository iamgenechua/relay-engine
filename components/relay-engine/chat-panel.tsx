"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";

export interface RelayChatMessage {
	id?: string;
	role: "user" | "assistant";
	content: string;
}

interface ChatPanelProps {
	isOpen: boolean;
	title?: string;
	isSending?: boolean;
	messages: RelayChatMessage[];
	onSend: (message: string) => void;
	onClose: () => void;
}

export default function ChatPanel({
	isOpen,
	title = "Support Assistant",
	isSending = false,
	messages,
	onSend,
	onClose,
}: ChatPanelProps) {
	const [value, setValue] = useState<string>("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = value.trim();
		if (!trimmed || isSending) return;

		onSend(trimmed);
		setValue("");
	};

	if (!isOpen) return null;

	return (
		<div
			style={{
				position: "fixed",
				right: 24,
				bottom: 84,
				width: "min(420px, calc(100vw - 24px))",
				height: 520,
				zIndex: 9998,
				borderRadius: 14,
				overflow: "hidden",
				border: "1px solid rgba(0,0,0,0.12)",
				background: "#ffffff",
				boxShadow: "0 14px 34px rgba(0,0,0,0.16)",
				display: "grid",
				gridTemplateRows: "auto 1fr auto",
			}}
		>
			<header
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "12px 14px",
					borderBottom: "1px solid rgba(0,0,0,0.08)",
				}}
			>
				<strong style={{ fontSize: 14 }}>{title}</strong>
				<button
					type="button"
					onClick={onClose}
					style={{
						border: "none",
						background: "transparent",
						cursor: "pointer",
					}}
				>
					Close
				</button>
			</header>

			<div style={{ overflowY: "auto", padding: 12, display: "grid", gap: 8 }}>
				{messages.length === 0 ? (
					<div style={{ color: "#6b7280", fontSize: 14 }}>
						Ask what happened in your app session.
					</div>
				) : (
					messages.map((message, index) => (
						<div
							key={message.id || index}
							style={{
								justifySelf: message.role === "user" ? "end" : "start",
								maxWidth: "82%",
								borderRadius: 10,
								padding: "8px 10px",
								fontSize: 14,
								lineHeight: 1.45,
								background: message.role === "user" ? "#1f6f4a" : "#f3f4f6",
								color: message.role === "user" ? "#fff" : "#111827",
							}}
						>
							{message.content}
						</div>
					))
				)}
			</div>

			<form
				onSubmit={handleSubmit}
				style={{
					borderTop: "1px solid rgba(0,0,0,0.08)",
					padding: 10,
					display: "grid",
					gap: 8,
				}}
			>
				<textarea
					value={value}
					onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
						setValue(event.target.value)
					}
					rows={3}
					placeholder="Explain the issue..."
					style={{
						width: "100%",
						resize: "none",
						borderRadius: 8,
						border: "1px solid #d1d5db",
						padding: 8,
						fontSize: 14,
					}}
				/>
				<button
					type="submit"
					disabled={isSending || !value.trim()}
					style={{
						justifySelf: "end",
						border: "none",
						borderRadius: 8,
						padding: "8px 12px",
						background: "#1f6f4a",
						color: "#fff",
						cursor: isSending || !value.trim() ? "not-allowed" : "pointer",
						opacity: isSending || !value.trim() ? 0.7 : 1,
					}}
				>
					{isSending ? "Sending..." : "Send"}
				</button>
			</form>
		</div>
	);
}
