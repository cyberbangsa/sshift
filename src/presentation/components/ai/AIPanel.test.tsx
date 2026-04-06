import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIPanel } from './AIPanel'
import { createAIMessage } from '@/test/factories'

describe('AIPanel', () => {
  const defaultProps = {
    messages: [] as ReturnType<typeof createAIMessage>[],
    isStreaming: false,
    error: null,
    onSendMessage: vi.fn(),
    onClearChat: vi.fn(),
  }

  it('should render the AI panel header', () => {
    render(<AIPanel {...defaultProps} />)

    expect(screen.getByText('Shift AI Agent')).toBeInTheDocument()
  })

  it('should render messages', () => {
    const messages = [
      createAIMessage({ role: 'user', content: 'Hello AI' }),
      createAIMessage({ role: 'assistant', content: 'Hello human!' }),
    ]
    render(<AIPanel {...defaultProps} messages={messages} />)

    expect(screen.getByText('Hello AI')).toBeInTheDocument()
    expect(screen.getByText('Hello human!')).toBeInTheDocument()
  })

  it('should send a message when clicking send', async () => {
    const user = userEvent.setup()
    render(<AIPanel {...defaultProps} />)

    await user.type(screen.getByPlaceholderText('Ask AI about this session\u2026'), 'Test message')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('should send a message on Enter key', async () => {
    const user = userEvent.setup()
    render(<AIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask AI about this session\u2026')
    await user.type(input, 'Enter test{Enter}')

    expect(defaultProps.onSendMessage).toHaveBeenCalled()
  })

  it('should not send empty messages', async () => {
    const onSendMessage = vi.fn()
    const user = userEvent.setup()
    render(<AIPanel {...defaultProps} onSendMessage={onSendMessage} />)

    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(onSendMessage).not.toHaveBeenCalled()
  })

  it('should display error message', () => {
    render(<AIPanel {...defaultProps} error="Something went wrong" />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should disable send button while streaming', () => {
    render(<AIPanel {...defaultProps} isStreaming={true} />)

    // When streaming the send button is replaced by a Stop AI button
    expect(screen.queryByRole('button', { name: /send message/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop ai/i })).toBeInTheDocument()
  })
})
