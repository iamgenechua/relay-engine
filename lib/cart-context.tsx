'use client'

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { CartItem } from './types'

interface CartContextValue {
  items: Record<string, CartItem>
  isDrawerOpen: boolean
  addToCart: (productId: string, name: string, price: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  openDrawer: () => void
  closeDrawer: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, CartItem>>({})
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const addToCart = useCallback((productId: string, name: string, price: number) => {
    setItems((prev) => ({
      ...prev,
      [productId]: {
        productId,
        name,
        price,
        quantity: (prev[productId]?.quantity ?? 0) + 1,
      },
    }))
    setIsDrawerOpen(true)
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => {
      const current = prev[productId]
      if (!current) return prev
      if (current.quantity <= 1) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [productId]: { ...current, quantity: current.quantity - 1 },
      }
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      const current = prev[productId]
      if (!current) return prev
      return {
        ...prev,
        [productId]: { ...current, quantity },
      }
    })
  }, [])

  const clearCart = useCallback(() => setItems({}), [])
  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  const cartItems = useMemo(() => Object.values(items).filter((i) => i.quantity > 0), [items])
  const totalItems = useMemo(() => cartItems.reduce((sum, i) => sum + i.quantity, 0), [cartItems])
  const totalPrice = useMemo(() => cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0), [cartItems])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isDrawerOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      openDrawer,
      closeDrawer,
      totalItems,
      totalPrice,
    }),
    [items, isDrawerOpen, addToCart, removeFromCart, updateQuantity, clearCart, openDrawer, closeDrawer, totalItems, totalPrice]
  )

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
