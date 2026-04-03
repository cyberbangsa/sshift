import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HostList } from './HostList'
import { createHost } from '@/test/factories'

describe('HostList', () => {
  const defaultProps = {
    hosts: [
      createHost({ id: '1', label: 'Production', hostname: 'prod.example.com', port: 22, username: 'admin' }),
      createHost({ id: '2', label: 'Staging', hostname: 'staging.example.com', port: 2222, username: 'deploy' }),
    ],
    selectedHostId: null,
    connectedHostIds: [] as string[],
    onSelectHost: vi.fn(),
    onConnectHost: vi.fn(),
    onDeleteHost: vi.fn(),
  }

  it('should render all hosts', () => {
    render(<HostList {...defaultProps} />)

    expect(screen.getByText('Production')).toBeInTheDocument()
    expect(screen.getByText('Staging')).toBeInTheDocument()
  })

  it('should display host connection details', () => {
    render(<HostList {...defaultProps} />)

    expect(screen.getByText('admin@prod.example.com:22')).toBeInTheDocument()
    expect(screen.getByText('deploy@staging.example.com:2222')).toBeInTheDocument()
  })

  it('should show empty state when no hosts', () => {
    render(<HostList {...defaultProps} hosts={[]} />)

    expect(screen.getByText(/No saved hosts/)).toBeInTheDocument()
  })

  it('should call onSelectHost when clicking a host', async () => {
    const user = userEvent.setup()
    render(<HostList {...defaultProps} />)

    await user.click(screen.getByText('Production'))

    expect(defaultProps.onSelectHost).toHaveBeenCalledWith('1')
  })

  it('should show connected badge for connected hosts', () => {
    render(<HostList {...defaultProps} connectedHostIds={['1']} />)

    expect(screen.getByText('Connected')).toBeInTheDocument()
  })
})
