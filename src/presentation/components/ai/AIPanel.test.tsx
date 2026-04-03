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

    expect(screen.getByText('SSHift AI')).toBeInTheDocument()
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

    await user.type(screen.getByPlaceholderText('Ask SSHift AI...'), 'Test message')
    await user.click(screen.getByText('Send'))

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Test message')
  })

  it('should send a message on Enter key', async () => {
    const user = userEvent.setup()
    render(<AIPanel {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Ask SSHift AI...')
    await user.type(textarea, 'Enter test{Enter}')

    expect(defaultProps.onSendMessage).toHaveBeenCalled()
  })

  it('should not send empty messages', async () => {
    const onSendMessage = vi.fn()
    const user = userEvent.setup()
    render(<AIPanel {...defaultProps} onSendMessage={onSendMessage} />)

    await user.click(screen.getByText('Send'))

    expect(onSendMessage).not.toHaveBeenCalled()
  })

  it('should display error message', () => {
    render(<AIPanel {...defaultProps} error="Something went wrong" />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should render action chips', () => {
    render(<AIPanel {...defaultProps} />)

    expect(screen.getByText('List files')).toBeInTheDocument()
    expect(screen.getByText('Disk space')).toBeInTheDocument()
  })

  it('should disable send button while streaming', () => {
    render(<AIPanel {...defaultProps} isStreaming={true} />)

    expect(screen.getByText('Send')).toBeDisabled()
  })
})
