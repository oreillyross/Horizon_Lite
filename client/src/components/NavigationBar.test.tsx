import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import NavigationBar from './NavigationBar';

const navItems = [
  { linkName: "Home", href: "/" },
  { linkName: "Snippets", href: "/snippet/show" },
  { linkName: "Create", href: "/snippet/create" },
  { linkName: "Profile", href: "/profile" },
];

function renderWithRouter(initialPath: string) {
  const { hook } = memoryLocation({ path: initialPath });
  return render(
    <Router hook={hook}>
      <NavigationBar items={navItems} />
    </Router>
  );
}

describe('NavigationBar', () => {
  it('highlights Home link when on / route', () => {
    renderWithRouter('/');
    
    const homeLink = screen.getByTestId('nav-link-');
    expect(homeLink.className).toContain('bg-blue-500');
    expect(homeLink.className).toContain('text-white');
    
    const snippetsLink = screen.getByTestId('nav-link-snippet-show');
    expect(snippetsLink.className).not.toContain('bg-blue-500');
  });

  it('highlights Snippets link when on /snippet/show route', () => {
    renderWithRouter('/snippet/show');
    
    const snippetsLink = screen.getByTestId('nav-link-snippet-show');
    expect(snippetsLink.className).toContain('bg-blue-500');
    expect(snippetsLink.className).toContain('text-white');
    
    const homeLink = screen.getByTestId('nav-link-');
    expect(homeLink.className).not.toContain('bg-blue-500');
  });

  it('highlights Create link when on /snippet/create route', () => {
    renderWithRouter('/snippet/create');
    
    const createLink = screen.getByTestId('nav-link-snippet-create');
    expect(createLink.className).toContain('bg-blue-500');
    expect(createLink.className).toContain('text-white');
    
    const snippetsLink = screen.getByTestId('nav-link-snippet-show');
    expect(snippetsLink.className).not.toContain('bg-blue-500');
  });

  it('shows no highlight on unknown routes', () => {
    renderWithRouter('/unknown');
    
    const homeLink = screen.getByTestId('nav-link-');
    const snippetsLink = screen.getByTestId('nav-link-snippet-show');
    const createLink = screen.getByTestId('nav-link-snippet-create');
    const profileLink = screen.getByTestId('nav-link-profile');
    
    expect(homeLink.className).not.toContain('bg-blue-500');
    expect(snippetsLink.className).not.toContain('bg-blue-500');
    expect(createLink.className).not.toContain('bg-blue-500');
    expect(profileLink.className).not.toContain('bg-blue-500');
  });

  it('renders all navigation items', () => {
    renderWithRouter('/');
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Snippets')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });
});
