// This page acts as a redirect so the sidebar CTA link /caddies/register
// lands on the caddies list with the registration modal already open.
// The caddies page watches for ?register=true and opens the modal automatically.
import { redirect } from 'next/navigation'

export default function RegisterCaddiePage() {
  redirect('/caddies?register=true')
}
