import { render, screen } from '@testing-library/react'
import PageLayout from './PageLayout'

describe('PageLayout', () => {
  it('renders children with default props', () => {
    render(
      <PageLayout>
        <div>Test Content</div>
      </PageLayout>,
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.getByText('Test Content').parentElement).toHaveClass('max-w-4xl', 'mx-auto')
  })

  it('applies custom maxWidth', () => {
    render(
      <PageLayout maxWidth="max-w-2xl">
        <div>Test Content</div>
      </PageLayout>,
    )

    const container = screen.getByText('Test Content').parentElement
    expect(container).toHaveClass('max-w-2xl')
  })

  it('applies custom padding', () => {
    render(
      <PageLayout padding="py-4 px-2">
        <div>Test Content</div>
      </PageLayout>,
    )

    const outerContainer = screen.getByText('Test Content').parentElement?.parentElement
    expect(outerContainer).toHaveClass('py-4', 'px-2')
  })

})
