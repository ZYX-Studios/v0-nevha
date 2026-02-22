'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { upsertDuesConfig } from '@/app/admin/qr-codes/actions'

interface Props {
    current: {
        annual_amount: number
        car_sticker_price: number
        dues_year: number
        due_date: string | null
    } | null
}

/**
 * Admin form for managing HOA dues configuration (annual dues + car sticker pricing).
 * Uses a server action to upsert the active configuration row.
 */
export function DuesConfigForm({ current }: Props) {
    const currentYear = new Date().getFullYear()
    const [pending, startTransition] = useTransition()

    const [annualAmount, setAnnualAmount] = useState(String(current?.annual_amount ?? ''))
    const [carStickerPrice, setCarStickerPrice] = useState(String(current?.car_sticker_price ?? ''))
    const [duesYear, setDuesYear] = useState(String(current?.dues_year ?? currentYear))
    const [dueDate, setDueDate] = useState(current?.due_date?.slice(0, 10) ?? '')

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(() => {
            void upsertDuesConfig(fd).then((result) => {
                if (result.success) {
                    toast.success('Dues configuration updated')
                } else {
                    toast.error(result.error || 'Failed to update configuration')
                }
            })
        })
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Settings2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Dues & Pricing</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Configure annual HOA dues and car sticker pricing for residents.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="annual_amount">Annual HOA Dues (₱)</Label>
                            <Input
                                id="annual_amount"
                                name="annual_amount"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                placeholder="e.g. 3600"
                                value={annualAmount}
                                onChange={(e) => setAnnualAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="car_sticker_price">Car Sticker Fee (₱)</Label>
                            <Input
                                id="car_sticker_price"
                                name="car_sticker_price"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                placeholder="e.g. 500"
                                value={carStickerPrice}
                                onChange={(e) => setCarStickerPrice(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="dues_year">Dues Year</Label>
                            <Input
                                id="dues_year"
                                name="dues_year"
                                type="number"
                                min="2020"
                                max="2099"
                                required
                                placeholder={String(currentYear)}
                                value={duesYear}
                                onChange={(e) => setDuesYear(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="due_date">Due Date (optional)</Label>
                            <Input
                                id="due_date"
                                name="due_date"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={pending} className="gap-2">
                            {pending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Configuration
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
