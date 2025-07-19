import { useState, useEffect, useRef } from 'react';
import { walletAPI } from '../services/api';

/**
 * Custom hook to handle payment timeout and automatic cancellation
 * @param {Object} options - Configuration options
 * @param {number} options.timeoutMinutes - Minutes before timeout (default: 15)
 * @param {Function} options.onTimeout - Callback when timeout occurs
 * @param {Function} options.onCancel - Callback when payment is cancelled
 * @param {Function} options.onStatusChange - Callback when status changes
 */
const usePaymentTimeout = ({
  timeoutMinutes = 15,
  onTimeout,
  onCancel,
  onStatusChange
} = {}) => {
  const [isActive, setIsActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [transactionId, setTransactionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, active, expired, cancelled, completed
  
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const statusCheckRef = useRef(null);

  // Clear all timers
  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
      statusCheckRef.current = null;
    }
  };

  // Start payment timeout monitoring
  const startTimeout = (txnId, orderData = {}) => {
    console.log(`🕐 Starting payment timeout for transaction: ${txnId}`);
    
    setTransactionId(txnId);
    setIsActive(true);
    setStatus('active');
    setRemainingTime(timeoutMinutes * 60); // Convert to seconds
    
    // Clear any existing timers
    clearTimers();
    
    // Start countdown timer
    intervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          handleTimeout(txnId);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    // Set main timeout
    timeoutRef.current = setTimeout(() => {
      handleTimeout(txnId);
    }, timeoutMinutes * 60 * 1000);

    // Start periodic status checking (every 30 seconds)
    statusCheckRef.current = setInterval(() => {
      checkTransactionStatus(txnId);
    }, 30000);

    // Notify status change
    if (onStatusChange) {
      onStatusChange('active', txnId, orderData);
    }
  };

  // Handle timeout
  const handleTimeout = async (txnId) => {
    console.log(`⏰ Payment timeout reached for transaction: ${txnId}`);
    
    try {
      // Cancel the transaction on backend
      await walletAPI.cancelTransaction(txnId, 'Payment timeout - user did not complete payment within time limit');
      
      setStatus('expired');
      setIsActive(false);
      clearTimers();
      
      // Notify timeout
      if (onTimeout) {
        onTimeout(txnId);
      }
      
      // Notify status change
      if (onStatusChange) {
        onStatusChange('expired', txnId);
      }
      
    } catch (error) {
      console.error('❌ Error cancelling timed out transaction:', error);
      // Still mark as expired locally
      setStatus('expired');
      setIsActive(false);
      clearTimers();
      
      if (onTimeout) {
        onTimeout(txnId, error);
      }
    }
  };

  // Check transaction status
  const checkTransactionStatus = async (txnId) => {
    try {
      const response = await walletAPI.checkTransactionStatus(txnId);
      
      if (response.success && response.data) {
        const { status: currentStatus } = response.data;
        
        // If transaction is completed or failed, stop monitoring
        if (currentStatus === 'completed' || currentStatus === 'failed' || currentStatus === 'expired') {
          console.log(`✅ Transaction ${txnId} status changed to: ${currentStatus}`);
          
          setStatus(currentStatus);
          setIsActive(false);
          clearTimers();
          
          if (onStatusChange) {
            onStatusChange(currentStatus, txnId);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking transaction status:', error);
    }
  };

  // Manually cancel payment
  const cancelPayment = async (reason = 'User cancelled payment') => {
    if (!transactionId || !isActive) return;
    
    console.log(`🚫 Manually cancelling payment: ${transactionId}`);
    
    try {
      await walletAPI.cancelTransaction(transactionId, reason);
      
      setStatus('cancelled');
      setIsActive(false);
      clearTimers();
      
      if (onCancel) {
        onCancel(transactionId, reason);
      }
      
      if (onStatusChange) {
        onStatusChange('cancelled', transactionId);
      }
      
    } catch (error) {
      console.error('❌ Error cancelling payment:', error);
      throw error;
    }
  };

  // Mark payment as completed (call this when payment succeeds)
  const markCompleted = () => {
    console.log(`✅ Payment completed: ${transactionId}`);
    
    setStatus('completed');
    setIsActive(false);
    clearTimers();
    
    if (onStatusChange) {
      onStatusChange('completed', transactionId);
    }
  };

  // Reset timeout state
  const reset = () => {
    clearTimers();
    setIsActive(false);
    setRemainingTime(0);
    setTransactionId(null);
    setStatus('idle');
  };

  // Format remaining time for display
  const formatRemainingTime = () => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get timeout progress (0-1)
  const getProgress = () => {
    const totalSeconds = timeoutMinutes * 60;
    return Math.max(0, (totalSeconds - remainingTime) / totalSeconds);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  return {
    // State
    isActive,
    remainingTime,
    transactionId,
    status,
    
    // Actions
    startTimeout,
    cancelPayment,
    markCompleted,
    reset,
    
    // Utilities
    formatRemainingTime,
    getProgress,
    
    // Status checks
    isExpired: status === 'expired',
    isCancelled: status === 'cancelled',
    isCompleted: status === 'completed',
    isTimedOut: status === 'expired' || remainingTime <= 0
  };
};

export default usePaymentTimeout;
