import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CLOCKIFY_BASE = "https://api.clockify.me/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { apiKey, action, params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    };

    let url = "";
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      case "getUser":
        url = `${CLOCKIFY_BASE}/user`;
        break;

      case "getWorkspaces":
        url = `${CLOCKIFY_BASE}/workspaces`;
        break;

      case "getProjects": {
        const { workspaceId, page = 1, pageSize = 500 } = params;
        url = `${CLOCKIFY_BASE}/workspaces/${workspaceId}/projects?page=${page}&page-size=${pageSize}`;
        break;
      }

      case "getTimeEntries": {
        const { workspaceId, userId, start, end, projectId, page = 1, pageSize = 200 } = params;
        let queryParams = `page=${page}&page-size=${pageSize}`;
        if (start) queryParams += `&start=${start}`;
        if (end) queryParams += `&end=${end}`;
        if (projectId) queryParams += `&project=${projectId}`;
        url = `${CLOCKIFY_BASE}/workspaces/${workspaceId}/user/${userId}/time-entries?${queryParams}`;
        break;
      }

      case "createTimeEntry": {
        const { workspaceId, entryData } = params;
        url = `${CLOCKIFY_BASE}/workspaces/${workspaceId}/time-entries`;
        method = "POST";
        body = JSON.stringify(entryData);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch(url, { method, headers, body });
    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || "Clockify API error", status: response.status }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
