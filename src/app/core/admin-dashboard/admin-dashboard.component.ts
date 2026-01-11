import { Component, OnInit } from '@angular/core';
import { ContactService } from '../services/contact.service';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

export interface DashboardRecord {
  id?: string;
  formType: 'contact' | 'registration' | 'consultation' | 'participant';
  name: string;
  email: string;
  phone?: string;
  date?: any;
  
  // Contact fields
  message?: string;
  
  // Registration fields
  company?: string;
  position?: string;
  mobile?: string;
  isEmployed?: string | null;
  
  // Consultation fields
  serviceType?: string;
  bookingDate?: string;
  bookingTime?: string;
  referral?: string;
  
  // Participant fields
  fullName?: string;
  certificateName?: string;
  jobTitle?: string;
  organization?: string;
  industry?: string;
  industryInterest?: string;
  careerStatus?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  Math = Math;
  
  records: DashboardRecord[] = [];
  paginatedRecords: DashboardRecord[] = [];
  
  activeFilter: 'contact' | 'registration' | 'consultation' | 'participant' = 'contact';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  searchTerm = '';
  loading = true;
  
  showModal = false;
  modalTitle = '';
  modalMessage = '';
  modalAction: 'deleteSingle' | 'deletePage' | null = null;
  selectedRecordId: string | null = null;
  selectedRecordName: string | null = null;
  
  constructor(
    private contactService: ContactService,
    private auth: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadRecords();
  }
  
  loadRecords(): void {
    this.loading = true;
    
    forkJoin({
      contacts: this.contactService.getContacts(),
      registrations: this.contactService.getRegistrations(),
      consultations: this.contactService.getConsultations(),
      participants: this.contactService.getParticipants()
    }).subscribe({
      next: ({ contacts, registrations, consultations, participants }) => {
        let combinedRecords: DashboardRecord[] = [];
        
        // Contact records
        combinedRecords.push(
          ...contacts.map(r => ({
            ...r,
            formType: 'contact' as const,
            name: r.name,
            email: r.email,
            phone: r.phone,
            message: r.message
          }))
        );
        
        // Registration records
        combinedRecords.push(
          ...registrations.map(r => ({
            ...r,
            formType: 'registration' as const,
            name: r.fullName,
            email: r.email,
            phone: r.mobile,
            company: r.companyName,
            position: r.role,
            isEmployed: r.isEmployed
          }))
        );
        
        // Consultation records
        combinedRecords.push(
          ...consultations.map(r => ({
            ...r,
            formType: 'consultation' as const,
            name: r.fullName,
            email: r.email,
            serviceType: r.registrationType,
            bookingDate: r.bookingDate,
            bookingTime: r.bookingTime,
            referral: r.referral
          }))
        );
        
        // Participant records
        combinedRecords.push(
          ...participants.map(r => ({
            ...r,
            formType: 'participant' as const,
            name: `${r.firstName || ''} ${r.middleName || ''} ${r.surname || ''}`.trim(),
            fullName: `${r.firstName || ''} ${r.middleName || ''} ${r.surname || ''}`.trim(),
            email: r.email,
            certificateName: r.certificateName,
            isEmployed: r.isEmployed,
            jobTitle: r.jobTitle,
            organization: r.organization,
            industry: r.industry,
            industryInterest: r.industryInterest,
            careerStatus: r.careerStatus
          }))
        );
        
        // Sort by date (newest first)
        this.records = combinedRecords.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA;
        });
        
        this.updatePagination();
        this.loading = false;
      },
      error: err => {
        console.error('Error loading records:', err);
        this.loading = false;
      }
    });
  }
  
  setActiveFilter(filterType: 'contact' | 'registration' | 'consultation' | 'participant'): void {
    this.activeFilter = filterType;
    this.currentPage = 1;
    this.updatePagination();
  }
  
  getActiveFilterLabel(): string {
    switch (this.activeFilter) {
      case 'contact': return 'Contact Form';
      case 'registration': return 'Registration';
      case 'consultation': return 'Consultation';
      case 'participant': return 'Participant Info';
      default: return 'Form';
    }
  }
  
  getColumnCount(): number {
    switch (this.activeFilter) {
      case 'contact': return 6;
      case 'registration': return 8;
      case 'consultation': return 8;
      case 'participant': return 9;
      default: return 5;
    }
  }
  
  updatePagination(): void {
    const filteredByType = this.records.filter(r => r.formType === this.activeFilter);
    
    const filtered = filteredByType.filter(r =>
      r.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (r.phone && r.phone.includes(this.searchTerm)) ||
      (this.activeFilter === 'participant' && 
       (r.certificateName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        r.organization?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        r.jobTitle?.toLowerCase().includes(this.searchTerm.toLowerCase())))
    );
    
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }
  
  onSearchChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }
  
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }
  
  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }
  
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  
  openDeleteSingleModal(id?: string, name?: string): void {
    if (!id) return;
    this.selectedRecordId = id;
    this.selectedRecordName = name || 'this record';
    this.modalTitle = 'Delete Record';
    this.modalMessage = `Are you sure you want to delete "${this.selectedRecordName}"?`;
    this.modalAction = 'deleteSingle';
    this.showModal = true;
  }
  
  openDeletePageModal(): void {
    if (this.paginatedRecords.length === 0) return;
    this.modalTitle = 'Delete Page Records';
    this.modalMessage = `Are you sure you want to delete all ${this.paginatedRecords.length} records on this page?`;
    this.modalAction = 'deletePage';
    this.showModal = true;
  }
  
  closeModal(): void {
    this.showModal = false;
    this.modalAction = null;
    this.selectedRecordId = null;
    this.selectedRecordName = null;
  }
  
  confirmAction(): void {
    if (this.modalAction === 'deleteSingle') {
      this.deleteSingleRecord();
    } else if (this.modalAction === 'deletePage') {
      this.deletePageRecords();
    }
    this.closeModal();
  }
  
  private deleteSingleRecord(): void {
    if (!this.selectedRecordId) return;
    
    const record = this.records.find(r => r.id === this.selectedRecordId);
    if (!record) return;
    
    const node = `${record.formType}s`;
    
    this.contactService.deleteRecord(`celcium/${node}`, this.selectedRecordId).subscribe({
      next: () => {
        this.records = this.records.filter(r => r.id !== this.selectedRecordId);
        this.updatePagination();
      },
      error: err => console.error('Error deleting record:', err)
    });
  }
  
  private deletePageRecords(): void {
    const deletePromises = this.paginatedRecords
      .filter(r => r.id)
      .map(r => {
        const node = `${r.formType}s`;
        return this.contactService.deleteRecord(`celcium/${node}`, r.id!).toPromise();
      });
    
    Promise.all(deletePromises)
      .then(() => {
        this.records = this.records.filter(
          r => !this.paginatedRecords.find(p => p.id === r.id)
        );
        this.updatePagination();
      })
      .catch(err => console.error('Error deleting page records:', err));
  }
  
  downloadPDF(): void {
    const filtered = this.records.filter(r => r.formType === this.activeFilter);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    doc.open();
    doc.write(`
      <html>
      <head>
        <title>${this.getActiveFilterLabel()} Records</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
          .info { text-align: center; margin-bottom: 20px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          tr:hover { background-color: #f5f5f5; }
          .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <h2>${this.getActiveFilterLabel()} Records</h2>
        <div class="info">
          Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}<br>
          Total Records: ${filtered.length}
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              ${this.activeFilter === 'contact' || this.activeFilter === 'registration' ? '<th>Phone</th>' : ''}
              ${this.activeFilter === 'contact' ? '<th>Message</th>' : ''}
              ${this.activeFilter === 'registration' ? '<th>Company</th><th>Position</th><th>Employment Status</th>' : ''}
              ${this.activeFilter === 'consultation' ? '<th>Service Type</th><th>Booking Date</th><th>Booking Time</th><th>Referral</th>' : ''}
              ${this.activeFilter === 'participant' ? '<th>Certificate Name</th><th>Employment</th><th>Job Title</th><th>Organization</th><th>Industry</th>' : ''}
              <th>Date Submitted</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.name || ''}</td>
                <td>${r.email || ''}</td>
                ${this.activeFilter === 'contact' || this.activeFilter === 'registration' ? `<td>${r.phone || ''}</td>` : ''}
                ${this.activeFilter === 'contact' ? `<td>${(r.message || '').substring(0, 100)}${r.message && r.message.length > 100 ? '...' : ''}</td>` : ''}
                ${this.activeFilter === 'registration' ? `<td>${r.company || ''}</td><td>${r.position || ''}</td><td>${r.isEmployed || ''}</td>` : ''}
                ${this.activeFilter === 'consultation' ? `<td>${r.serviceType || ''}</td><td>${r.bookingDate || ''}</td><td>${r.bookingTime || ''}</td><td>${r.referral || ''}</td>` : ''}
                ${this.activeFilter === 'participant' ? `<td>${r.certificateName || ''}</td><td>${r.isEmployed || ''}</td><td>${r.jobTitle || ''}</td><td>${r.organization || ''}</td><td>${r.industry || r.industryInterest || ''}</td>` : ''}
                <td>${r.date ? new Date(r.date).toLocaleString() : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Celcium360 Admin Dashboard Report
        </div>
      </body>
      </html>
    `);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  }
  
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}