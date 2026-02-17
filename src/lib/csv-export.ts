import { Lead } from '@/lib/api';

export function exportLeadsToCSV(leads: Lead[], filename: string = 'leads') {
  // Define CSV headers
  const headers = [
    'Name',
    'Title',
    'Company',
    'Email',
    'Phone',
    'Location',
    'Industry',
    'Status',
    'LinkedIn URL',
    'Created At',
  ];

  // Convert leads to CSV rows
  const rows = leads.map(lead => [
    escapeCSVField(lead.name),
    escapeCSVField(lead.title || ''),
    escapeCSVField(lead.company),
    escapeCSVField(lead.email),
    escapeCSVField(lead.phone || ''),
    escapeCSVField(lead.location || ''),
    escapeCSVField(lead.industry || ''),
    escapeCSVField(lead.status || 'new'),
    escapeCSVField(lead.linkedin_url || ''),
    escapeCSVField(formatDate(lead.created_at)),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${formatDateForFilename(new Date())}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSVField(field: string): string {
  // If field contains comma, newline, or double quote, wrap in quotes and escape internal quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}
