'use client'

import { MAINTENANCE_MODE } from '@/config/maintenance'
import MaintenancePage from '@/app/maintenance/page'

export default function MaintenanceWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  // If maintenance mode is enabled, show maintenance page
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />
  }

  // Otherwise, show normal app
  return <>{children}</>
}

