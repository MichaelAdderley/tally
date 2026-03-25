import { supabase } from './supabaseClient'

async function callProxy(apiKey, action, params = {}) {
  const { data, error } = await supabase.functions.invoke('clockify-proxy', {
    body: { apiKey, action, params }
  })
  if (error) throw new Error(error.message || 'Edge function error')
  if (data?.error) throw new Error(data.error)
  return data
}

export async function validateApiKey(apiKey) {
  const user = await callProxy(apiKey, 'getUser')
  return user // { id, email, name, ... }
}

export async function fetchWorkspaces(apiKey) {
  return await callProxy(apiKey, 'getWorkspaces')
}

export async function fetchClockifyProjects(apiKey, workspaceId) {
  return await callProxy(apiKey, 'getProjects', { workspaceId })
}

export async function fetchClockifyTimeEntries(apiKey, workspaceId, userId, params = {}) {
  const allEntries = []
  let page = 1
  const pageSize = 200

  // Paginate through all entries
  while (true) {
    const entries = await callProxy(apiKey, 'getTimeEntries', {
      workspaceId,
      userId,
      page,
      pageSize,
      ...params
    })
    allEntries.push(...entries)
    if (entries.length < pageSize) break
    page++
  }

  return allEntries
}

export async function createClockifyTimeEntry(apiKey, workspaceId, entryData) {
  return await callProxy(apiKey, 'createTimeEntry', { workspaceId, entryData })
}
