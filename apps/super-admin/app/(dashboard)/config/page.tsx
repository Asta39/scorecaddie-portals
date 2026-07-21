import { createClient } from '@/lib/supabase'
import ConfigEditor from '@/components/config/ConfigEditor'
import BrandColorPicker from '@/components/config/BrandColorPicker'

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
        <h1 className="text-2xl font-bold text-foreground">Platform Config</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Runtime settings — changes take effect immediately without redeployment
        </p>
      </div>

      <div className="card max-w-2xl mb-6">
        <div className="card-header">
          <p className="text-sm font-semibold text-foreground">Brand color</p>
          <p className="text-xs text-muted-foreground">Portal-wide accent</p>
        </div>
        <BrandColorPicker
          initialColor={config?.find(c => c.key === 'platform_brand_color')?.value ?? '#0f766e'}
        />
      </div>

      <div className="card max-w-2xl">
        <div className="card-header">
          <p className="text-sm font-semibold text-foreground">Settings</p>
          <p className="text-xs text-muted-foreground">Click any value to edit</p>
        </div>
        <ConfigEditor config={(config ?? []).filter(c => c.key !== 'platform_brand_color')} />
      </div>
    </div>
  )
}
