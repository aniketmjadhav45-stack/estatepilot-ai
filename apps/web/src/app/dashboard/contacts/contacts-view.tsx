'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Users,
  Building,
  Mail,
  Phone,
  Tag,
  ChevronRight,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { Contact, ContactType } from '@estatepilot/shared';
import { createContactAction } from '../../actions/crm';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { EmptyState } from '../../../components/ui/empty-state';

interface ContactsViewProps {
  initialContacts: Contact[];
  totalContacts: number;
}

export function ContactsView({ initialContacts, totalContacts }: ContactsViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // New Contact Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    type: 'client' as ContactType,
    tagInput: '',
  });

  const filtered = initialContacts.filter((c) => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const matchCompany = (c.company || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      if (!matchName && !matchEmail && !matchCompany && !matchPhone) return false;
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const tags = formData.tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await createContactAction({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      company: formData.company.trim() || undefined,
      type: formData.type,
      tags,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to create contact');
      return;
    }

    setIsModalOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      type: 'client',
      tagInput: '',
    });
    router.refresh();
  };

  const typeBadgeVariant: Record<ContactType, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
    client: 'default',
    buyer: 'info',
    seller: 'purple',
    investor: 'success',
    landlord: 'warning',
    renter: 'default',
    agent: 'default',
    other: 'default',
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts by name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Contact Types</option>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
            <option value="investor">Investors</option>
            <option value="landlord">Landlords</option>
            <option value="renter">Renters</option>
            <option value="client">General Clients</option>
          </select>
        </div>

        <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)} className="gap-1.5 self-end sm:self-auto">
          <Plus className="w-3.5 h-3.5" />
          <span>New Contact</span>
        </Button>
      </div>

      {/* Contacts List / Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-slate-400" />}
          title="No contacts found"
          description={
            initialContacts.length === 0
              ? 'Your contacts directory is currently empty. Add your first client or partner.'
              : 'Try clearing your search keyword or filters.'
          }
          actionLabel={initialContacts.length === 0 ? 'Add Contact' : 'Clear Filters'}
          onAction={
            initialContacts.length === 0
              ? () => setIsModalOpen(true)
              : () => {
                  setSearchQuery('');
                  setTypeFilter('all');
                }
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3">Contact Info</th>
                  <th className="py-3 px-3">Tags</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {contact.firstName} {contact.lastName}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={typeBadgeVariant[contact.type] || 'default'} size="sm">
                        {contact.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {contact.company || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-600 space-y-0.5">
                        {contact.email && <div>{contact.email}</div>}
                        {contact.phone && <div className="text-slate-400 text-[11px]">{contact.phone}</div>}
                        {!contact.email && !contact.phone && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CREATE CONTACT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Contact"
        description="Register a client, partner, buyer, or seller in your address book."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Eleanor"
            />
            <Input
              label="Last Name"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Vance"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@company.com"
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Company / Firm"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g. Vance Capital LLC"
            />
            <Select
              label="Contact Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ContactType })}
            >
              <option value="client">Client</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="investor">Investor</option>
              <option value="landlord">Landlord</option>
              <option value="renter">Renter</option>
              <option value="agent">External Agent</option>
            </Select>
          </div>

          <Input
            label="Tags (comma separated)"
            value={formData.tagInput}
            onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
            placeholder="vip, luxury, downtown, repeat_buyer"
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
