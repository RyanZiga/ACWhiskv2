import { useEffect, useRef } from 'react'
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

interface RealtimeManagerProps {
  supabase: SupabaseClient
  conversationId: string | null
  userId: string
  onNewMessage: (message: any) => void
  onMessageUpdate: (message: any) => void
  onMessageDelete: (messageId: string) => void
  onTypingUpdate: (typingUsers: string[]) => void
  onConnectionStatusChange: (status: 'connected' | 'connecting' | 'disconnected') => void
}

export function RealtimeManager({
  supabase,
  conversationId,
  userId,
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  onTypingUpdate,
  onConnectionStatusChange
}: RealtimeManagerProps) {
  const messageChannelRef = useRef<RealtimeChannel | null>(null)
  const typingChannelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (conversationId) {
      setupMessageSubscription(conversationId)
      setupTypingSubscription(conversationId)
    } else {
      cleanup()
    }

    return cleanup
  }, [conversationId])

  const setupMessageSubscription = (convId: string) => {
    // Clean up existing subscription
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
    }

    onConnectionStatusChange('connecting')

    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        async (payload) => {
          try {
            const newMessage = payload.new
            
            // Fetch complete message data with sender info
            const { data: fullMessage, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:user_profiles (
                  id,
                  name,
                  avatar_url
                )
              `)
              .eq('id', newMessage.id)
              .single()

            if (!error && fullMessage) {
              onNewMessage(fullMessage)
            }
          } catch (error) {
            console.error('Error handling new message:', error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          onMessageUpdate(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          onMessageDelete(payload.old.id)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          onConnectionStatusChange('connected')
        } else if (status === 'CHANNEL_ERROR') {
          onConnectionStatusChange('disconnected')
        }
      })

    messageChannelRef.current = channel
  }

  const setupTypingSubscription = (convId: string) => {
    // Clean up existing subscription
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current)
    }

    const channel = supabase
      .channel(`typing-${convId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${convId}`
        },
        async (payload) => {
          try {
            // Fetch current typing users for this conversation
            const { data: typingData, error } = await supabase
              .from('typing_indicators')
              .select(`
                user_id,
                user_profiles (name)
              `)
              .eq('conversation_id', convId)
              .neq('user_id', userId)

            if (!error) {
              const typingUserNames = typingData
                ?.map(t => t.user_profiles?.name)
                .filter(Boolean) || []
              
              onTypingUpdate(typingUserNames)
            }
          } catch (error) {
            console.error('Error handling typing update:', error)
          }
        }
      )
      .subscribe()

    typingChannelRef.current = channel
  }

  const cleanup = () => {
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
      messageChannelRef.current = null
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current)
      typingChannelRef.current = null
    }
  }

  return null // This is a hook component, no UI
}