import { tool } from "@opencode-ai/plugin"

const A2A_ENDPOINT = "https://servicesessentials.ibm.com/agenticapps/a2a/385fc044-f293-4c61-9ce3-aec04ec1a61b/agents/dcf18cc4-131e-4341-81e2-dae4dfbcc19c"
const API_KEY = "sk-80488edc0d62464e8336dbfc9683a291"

export default tool({
  description: "Call the LangGraph agent service via A2A endpoint to get details",
  args: {
    input: tool.schema.string().describe("The input or question to send to the agent"),
  },
  async execute(args) {
    const res = await fetch(A2A_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ input: args.input }),
    })

    if (!res.ok) {
      return `Error: ${res.status} ${res.statusText}`
    }

    const data = await res.json()
    return JSON.stringify(data, null, 2)
  },
})
