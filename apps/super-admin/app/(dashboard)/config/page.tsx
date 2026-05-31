import { createClient } from '@/lib/supabase'
import ConfigEditor from '@/components/config/ConfigEditor'

export const dynamic = 'force-dynamic'

export default async function ConfigPage() {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('platform_config')
    .select('*')
    .order('key')

  return (
    <div className="portal-content">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Platform Config</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Runtime settings — changes take effect immediately without redeployment
        </p>
      </div>

      <div className="card max-w-2xl">
        <div className="card-header">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Settings</p>
          <p className="text-xs" style={{ color: 'var(--color-light)' }}>Click any value to edit</p>
        </div>
        <ConfigEditor config={config ?? []} />
      </div>
    </div>
  )
}
