import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddHostModal } from './AddHostModal'

describe('AddHostModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  }

  it('should not render when closed', () => {
    render(<AddHostModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Add Host')).not.toBeInTheDocument()
  })

  it('should render the form when open', () => {
    render(<AddHostModal {...defaultProps} />)

    expect(screen.getByRole('heading', { name: 'Add Host' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('My Server')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('192.168.1.1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('root')).toBeInTheDocument()
  })

  it('should show validation errors for empty required fields', async () => {
    const user = userEvent.setup()
    render(<AddHostModal {...defaultProps} />)

    await user.click(screen.getByText('Add Host', { selector: 'button' }))

    expect(screen.getByText('Label is required')).toBeInTheDocument()
    expect(screen.getByText('Hostname is required')).toBeInTheDocument()
    expect(screen.getByText('Username is required')).toBeInTheDocument()
    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })

  it('should call onSave with valid data', async () => {
    const user = userEvent.setup()
    render(<AddHostModal {...defaultProps} />)

    await user.type(screen.getByPlaceholderText('My Server'), 'Test Server')
    await user.type(screen.getByPlaceholderText('192.168.1.1'), '10.0.0.1')
    await user.type(screen.getByPlaceholderText('root'), 'admin')

    await user.click(screen.getByText('Add Host', { selector: 'button' }))

    expect(defaultProps.onSave).toHaveBeenCalledTimes(1)
    const savedHost = defaultProps.onSave.mock.calls[0][0]
    expect(savedHost.label).toBe('Test Server')
    expect(savedHost.hostname).toBe('10.0.0.1')
    expect(savedHost.username).toBe('admin')
    expect(savedHost.port).toBe(22)
  })

  it('should show private key field when auth method is privateKey', async () => {
    const user = userEvent.setup()
    render(<AddHostModal {...defaultProps} />)

    await user.selectOptions(screen.getByDisplayValue('Password'), 'privateKey')

    expect(screen.getByPlaceholderText('~/.ssh/id_rsa')).toBeInTheDocument()
  })
})
