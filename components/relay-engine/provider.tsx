'use client'

import type { ReactNode } from 'react'
import RelayLauncher from './relay-launcher'

interface AIFDEProviderProps {
  children: ReactNode
}

export default function AIFDEProvider({ children }: AIFDEProviderProps) {
  return (
    <>
      {children}
      <RelayLauncher />
    </>
  )
}
