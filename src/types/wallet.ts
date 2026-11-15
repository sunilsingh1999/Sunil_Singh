export type UpiAppId = 'gpay' | 'paytm' | 'phonepe' | 'bhim' | 'qr';
export type DepositRail = 'razorpay' | 'direct_upi';
export type WithdrawMethod = 'gpay' | 'paytm' | 'bank_upi';

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  rail: 'razorpay_upi' | 'direct_upi' | 'upi_payout' | 'welcome_credit';
  upiApp?: UpiAppId;
  withdrawMethod?: WithdrawMethod;
  upiHandle?: string;
  utr: string;
  orderId?: string;
  status: 'verified' | 'completed';
  createdAt: number;
}

export interface SavedPayoutHandle {
  method: WithdrawMethod;
  handle: string;
}
