import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { validateApiKey, fetchWorkspaces } from './clockifyService'

export default function SettingsModal({ onClose, onSave, currentSettings }) {
  const [apiKey, setApiKey] = useState(currentSettings?.clockify_api_key || '')
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspace, setSelectedWorkspace] = useState(currentSettings?.clockify_workspace_id || '')
  const [userId, setUserId] = useState(currentSettings?.clockify_user_id || '')
  const [userName, setUserName] = useState('')
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(!!currentSettings?.clockify_api_key)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // If we already have settings, validate on mount to show user info
    if (currentSettings?.clockify_api_key) {
      handleValidate(currentSettings.clockify_api_key)
    }
  }, [])

  async function handleValidate(key = apiKey) {
    setValidating(true)
    setError('')
    try {
      const user = await validateApiKey(key)
      setUserId(user.id)
      setUserName(user.name || user.email)
      setValidated(true)

      const ws = await fetchWorkspaces(key)
      setWorkspaces(ws)
      if (ws.length === 1 && !selectedWorkspace) {
        setSelectedWorkspace(ws[0].id)
      }
    } catch (err) {
      setError('Invalid API key. Please check and try again.')
      setValidated(false)
    } finally {
      setValidating(false)
    }
  }

  async function handleSave() {
    if (!validated || !selectedWorkspace) return
    setSaving(true)
    try {
      const settings = {
        clockify_api_key: apiKey,
        clockify_workspace_id: selectedWorkspace,
        clockify_user_id: userId
      }

      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('user_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }

      onSave(settings)
      onClose()
    } catch (err) {
      setError('Failed to save settings: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setSaving(true)
    try {
      await supabase.from('user_settings').delete().in('key', [
        'clockify_api_key',
        'clockify_workspace_id',
        'clockify_user_id'
      ])
      onSave(null)
      onClose()
    } catch (err) {
      setError('Failed to disconnect: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-xl p-6 w-full max-w-lg" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>Settings</h2>
          <button onClick={onClose} className="text-2xl cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)' }}>×</button>
        </div>

        {/* Clockify Integration Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Clockify Integration</h3>

          {/* API Key */}
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>API Key</label>
          <div className="flex gap-2 mb-3">
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setValidated(false) }}
              placeholder="Enter your Clockify API key"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#141414', border: '1px solid #333', color: 'rgba(255,255,255,0.85)' }}
            />
            <button
              onClick={() => handleValidate()}
              disabled={!apiKey || validating}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{
                background: validated ? '#00b894' : '#6c5ce7',
                color: '#fff',
                opacity: !apiKey || validating ? 0.5 : 1
              }}
            >
              {validating ? 'Checking...' : validated ? '✓ Valid' : 'Validate'}
            </button>
          </div>

          {/* Connected User */}
          {validated && userName && (
            <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Connected as: </span>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{userName}</span>
            </div>
          )}

          {/* Workspace Selector */}
          {validated && workspaces.length > 0 && (
            <>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Workspace</label>
              <select
                value={selectedWorkspace}
                onChange={e => setSelectedWorkspace(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3 cursor-pointer"
                style={{ background: '#141414', border: '1px solid #333', color: 'rgba(255,255,255,0.85)' }}
              >
                <option value="">Select a workspace</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </>
          )}

          {error && (
            <p className="text-sm mb-3" style={{ color: '#e17055' }}>{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          {currentSettings?.clockify_api_key ? (
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer"
              style={{ background: '#2a2a2a', color: '#e17055' }}
            >
              Disconnect Clockify
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer"
              style={{ background: '#2a2a2a', color: 'rgba(255,255,255,0.6)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!validated || !selectedWorkspace || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{
                background: '#6c5ce7',
                color: '#fff',
                opacity: !validated || !selectedWorkspace || saving ? 0.5 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
