import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {

  registrationForm!: FormGroup;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private dataService: ContactService
  ) {}

  ngOnInit(): void {
    this.registrationForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],

      email: ['', [
        Validators.required,
        Validators.email
      ]],

      mobile: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{11}$/) // strict 11-digit Nigeria format
      ]],

      isEmployed: [null, Validators.required],

      companyName: [''], // will be validated dynamically

      role: [''],

      registrationType: ['', Validators.required],

      gains: ['', [Validators.minLength(10)]],

      referral: ['', Validators.required],

      consent: [false, Validators.requiredTrue]
    });

    // 🔥 Dynamic validation (companyName required when employed = Yes)
    this.registrationForm.get('isEmployed')?.valueChanges.subscribe(value => {
      const companyControl = this.registrationForm.get('companyName');

      if (value === 'Yes') {
        companyControl?.setValidators([Validators.required, Validators.minLength(2)]);
      } else {
        companyControl?.clearValidators();
      }
      companyControl?.updateValueAndValidity();
    });
  }

  // ---------------------------------------
  // SUBMIT FORM
  // ---------------------------------------
  onSubmit() {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const payload = this.registrationForm.value;

    this.dataService.saveRegistration(payload).subscribe({
      next: (response) => {
        console.log("Saved:", response.name);

        this.formSubmitted = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => this.resetForm(), 6000);
      },
      error: () => {
        alert("Submission failed. Please try again later.");
      }
    });
  }

  // RESET FORM
  resetForm() {
    this.formSubmitted = false;
    this.registrationForm.reset();
  }

  // Shortcut for HTML
  get f() {
    return this.registrationForm.controls;
  }
}
