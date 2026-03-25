import { supabase } from './supabaseClient'
import {
  fetchClockifyProjects,
  fetchClockifyTimeEntries,
  createClockifyTimeEntry
} from './clockifyService'

/**
 * Pull: Sync Clockify projects and time entries into Tally (Supabase)
 * - Auto-matches projects by name (case-insensitive)
 * - Creates new Tally projects for unmatched Clockify projects
 * - Imports time entries, skipping duplicates via clockify_entry_id
 */
export async function pullFromClockify(apiKey, workspaceId, userId) {
  const results = { projectsSynced: 0, entriesImported: 0, errors: [] }

  try {
    // 1. Fetch Clockify projects
    const clockifyProjects = await fetchClockifyProjects(apiKey, workspaceId)

    // 2. Fetch existing Tally projects
    const { data: tallyProjects, error: projErr } = await supabase
      .from('projects')
      .select('*')
    if (projErr) throw projErr

    // 3. Auto-match by name and link/create
    for (const cp of clockifyProjects) {
      try {
        const match = tallyProjects.find(
          tp => tp.name.toLowerCase().trim() === cp.name.toLowerCase().trim()
        )

        let tallyProjectId
        if (match) {
          // Link existing project if not already linked
          if (!match.clockify_project_id) {
            await supabase
              .from('projects')
              .update({
                clockify_project_id: cp.id,
                clockify_workspace_id: workspaceId
              })
              .eq('id', match.id)
          }
          tallyProjectId = match.id
        } else {
          // Create new Tally project from Clockify
          const budget = cp.estimate?.estimate
            ? parseDuration(cp.estimate.estimate)
            : 0
          const { data: newProj, error: createErr } = await supabase
            .from('projects')
            .insert({
              name: cp.name,
              budget,
              color: '#6c5ce7',
              description: cp.note || '',
              clockify_project_id: cp.id,
              clockify_workspace_id: workspaceId
            })
            .select()
            .single()
          if (createErr) throw createErr
          tallyProjectId = newProj.id
        }
        results.projectsSynced++

        // 4. Fetch Clockify time entries for this project
        const entries = await fetchClockifyTimeEntries(apiKey, workspaceId, userId, {
          projectId: cp.id
        })

        // 5. Get existing clockify_entry_ids to skip duplicates
        const { data: existingLogs } = await supabase
          .from('time_logs')
          .select('clockify_entry_id')
          .eq('project_id', tallyProjectId)
          .not('clockify_entry_id', 'is', null)

        const existingIds = new Set((existingLogs || []).map(l => l.clockify_entry_id))

        // 6. Import new entries
        const newEntries = entries
          .filter(e => !existingIds.has(e.id) && e.timeInterval?.start)
          .map(e => {
            const start = new Date(e.timeInterval.start)
            const end = e.timeInterval.end ? new Date(e.timeInterval.end) : start
            const hours = Math.round(((end - start) / 3600000) * 100) / 100
            return {
              project_id: tallyProjectId,
              date: start.toISOString().split('T')[0],
              hours: hours > 0 ? hours : 0,
              note: e.description || 'Clockify import',
              from_timer: false,
              clockify_entry_id: e.id
            }
          })
          .filter(e => e.hours > 0)

        if (newEntries.length > 0) {
          const { error: insertErr } = await supabase
            .from('time_logs')
            .insert(newEntries)
          if (insertErr) throw insertErr
          results.entriesImported += newEntries.length
        }
      } catch (err) {
        results.errors.push(`Project "${cp.name}": ${err.message}`)
      }
    }
  } catch (err) {
    results.errors.push(`Sync failed: ${err.message}`)
  }

  return results
}

/**
 * Push: Send a single Tally time entry to Clockify
 * - Only pushes if the project is linked (has clockify_project_id)
 * - Only pushes if the entry doesn't already have a clockify_entry_id
 * - Updates the time_log row with the returned clockify_entry_id
 */
export async function pushToClockify(apiKey, project, timeLog) {
  if (!project.clockify_project_id || !project.clockify_workspace_id) {
    return null // Project not linked to Clockify
  }
  if (timeLog.clockify_entry_id) {
    return null // Already synced
  }

  try {
    // Construct start/end from date + hours
    const startDate = new Date(`${timeLog.date}T09:00:00Z`)
    const endDate = new Date(startDate.getTime() + timeLog.hours * 3600000)

    const entryData = {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      projectId: project.clockify_project_id,
      description: timeLog.note || 'Tally entry'
    }

    const result = await createClockifyTimeEntry(
      apiKey,
      project.clockify_workspace_id,
      entryData
    )

    // Save the Clockify entry ID back to Supabase
    if (result?.id) {
      await supabase
        .from('time_logs')
        .update({ clockify_entry_id: result.id })
        .eq('id', timeLog.id)
    }

    return result
  } catch (err) {
    console.error('Push to Clockify failed:', err)
    return null
  }
}

/**
 * Parse Clockify ISO 8601 duration (e.g., "PT2H30M") to hours
 */
function parseDuration(duration) {
  if (!duration) return 0
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || 0)
  const minutes = parseInt(match[2] || 0)
  const seconds = parseInt(match[3] || 0)
  return Math.round((hours + minutes / 60 + seconds / 3600) * 100) / 100
}
