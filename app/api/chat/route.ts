import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { getUserEvents } from '@/lib/tools/posthog'
import { readSourceFile } from '@/lib/tools/codebase'
import { searchBusinessRules } from '@/lib/tools/business-rules'
import { addReport } from '@/lib/store'

export async function POST(req: Request) {
  const { messages, elementContext, autoTriggered, errorMessage, sessionId } =
    await req.json()

  let systemPrompt = `You are Relay — an empathetic customer success agent embedded in a web application. Your role is to help users who encounter problems, investigate the root cause, and classify the issue for engineers.

## Personality
- Lead with empathy. Acknowledge frustration before investigating.
- Never use technical jargon with users. Speak plainly and warmly.
- Investigate before asking — use your tools to gather context first, then ask the user only if needed.
- Be concise. Users are frustrated; don't make them read walls of text.

## Investigation Process
1. Check the user's recent events with getUserEvents to understand what they did.
2. Search business rules with searchBusinessRules to check if the behavior is intentional.
3. If needed, read source code with readSourceFile to understand the implementation.
4. Once you understand the issue, classify it with classifyIssue.

## Classification Guidelines
- **bug**: The code does something it shouldn't. Broken logic, crashes, wrong data.
- **ux_issue**: The code works as designed, but the design creates confusion or frustration. Missing feedback, confusing labels, poor error messages.
- **edge_case**: A scenario the code doesn't handle well. Not broken, but not graceful either. Out-of-stock items still showing as purchasable, etc.

After classifying, give the user a brief, friendly summary of what you found and that the engineering team has been notified.`

  if (elementContext) {
    systemPrompt += `

## Element Context
The user selected this element on the page:
- Element: ${elementContext.elementName}
- CSS Selector: ${elementContext.cssSelector}
- Visible Text: ${elementContext.visibleText}`
  }

  if (errorMessage) {
    systemPrompt += `

## Error Context
An error was detected on the page: "${errorMessage}"
The chat was ${autoTriggered ? 'auto-triggered by the error' : 'manually opened by the user'}.
${autoTriggered ? 'Start by acknowledging the error and investigating it immediately — the user did not initiate this conversation, so be proactive.' : ''}`
  }

  if (sessionId) {
    systemPrompt += `

## Session
The user's PostHog session ID is: "${sessionId}". Use this when calling getUserEvents.`
  }

  const result = streamText({
    model: openai('gpt-4.1'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      getUserEvents: tool({
        description:
          'Get the recent event timeline for the current user session. Shows what pages they visited, what they clicked, and any errors.',
        inputSchema: z.object({
          sessionId: z
            .string()
            .describe('The session ID to look up events for. Use "current" for the active session.'),
        }),
        execute: async ({ sessionId }) => {
          const events = await getUserEvents(sessionId)
          return { events }
        },
      }),
      readSourceFile: tool({
        description:
          'Read a source file from the project. Restricted to app/, components/, lib/, and docs/ directories.',
        inputSchema: z.object({
          filePath: z
            .string()
            .describe(
              'The file path relative to the project root, e.g. "app/api/orders/[id]/status/route.ts"'
            ),
        }),
        execute: async ({ filePath }) => {
          const content = await readSourceFile(filePath)
          return { content }
        },
      }),
      searchBusinessRules: tool({
        description:
          'Search the business rules document to check if observed behavior is intentional or a known issue. Use keywords like "transition", "stock", "checkout", "error".',
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              'Search query — a keyword or phrase to find in the business rules.'
            ),
        }),
        execute: async ({ query }) => {
          const rules = await searchBusinessRules(query)
          return { rules }
        },
      }),
      classifyIssue: tool({
        description:
          'Classify the issue after investigation. This saves a report for the engineering team. Call this exactly once when you have enough evidence.',
        inputSchema: z.object({
          type: z
            .enum(['bug', 'edge_case', 'ux_issue'])
            .describe('The classification type.'),
          title: z
            .string()
            .describe('A short title for the issue, e.g. "Invalid status transition button shown on pending orders".'),
          summary: z
            .string()
            .describe('A 1-2 sentence summary of what happened and why.'),
          evidence: z
            .string()
            .describe(
              'Technical evidence — what you found in code, business rules, or event timeline.'
            ),
          userQuote: z
            .string()
            .describe(
              'A relevant quote from the user describing their experience, or empty string if auto-triggered.'
            ),
        }),
        execute: async ({ type, title, summary, evidence, userQuote }) => {
          const report = addReport({
            type,
            title,
            summary,
            evidence,
            userQuote,
            elementContext: elementContext
              ? `${elementContext.elementName} (${elementContext.cssSelector})`
              : '',
            conversationLog: messages.map(
              (m: { role: string; content: string }) => ({
                role: m.role,
                content:
                  typeof m.content === 'string'
                    ? m.content
                    : JSON.stringify(m.content),
              })
            ),
            eventTimeline: [],
          })
          return { type, title, summary, evidence, reportId: report.id }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
