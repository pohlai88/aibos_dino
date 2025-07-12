import React, { useState, useEffect } from 'react';
import { aibosPlatformService, Tenant } from '../services/aibos-platform.ts';

interface TenantOnboardingProps {
  onTenantCreated?: (tenant: Tenant) => void;
  onSkip?: () => void;
}

const TenantOnboarding: React.FC<TenantOnboardingProps> = ({ onTenantCreated, onSkip }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
    contactEmail: '',
    planType: 'free' as 'free' | 'basic' | 'pro' | 'enterprise'
  });

  // Validation
  const [validation, setValidation] = useState({
    name: true,
    slug: true,
    email: true
  });

  // Update form data
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validation[field as keyof typeof validation] === false) {
      setValidation(prev => ({ ...prev, [field]: true }));
    }
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Validate form
  const validateForm = (): boolean => {
    const newValidation = {
      name: formData.name.trim().length >= 2,
      slug: formData.slug.trim().length >= 2 && /^[a-z0-9-]+$/.test(formData.slug),
      email: !formData.contactEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)
    };

    setValidation(newValidation);
    return Object.values(newValidation).every(Boolean);
  };

  // Create tenant
  const createTenant = async () => {
    if (!validateForm()) {
      setError('Please fix the validation errors');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await aibosPlatformService.createTenant(
        formData.name.trim(),
        formData.slug.trim(),
        formData.description.trim() || undefined
      );

      if (response.success && response.data) {
        // Update tenant with additional info
        const updateData: Partial<Tenant> = {};
        if (formData.website) updateData.website_url = formData.website;
        if (formData.contactEmail) updateData.contact_email = formData.contactEmail;
        if (formData.planType !== 'free') updateData.plan_type = formData.planType;

        // Note: In a real implementation, you'd update the tenant here
        // For now, we'll just proceed with the created tenant

        onTenantCreated?.(response.data);
        setStep(4); // Success step
      } else {
        setError(response.error || 'Failed to create tenant');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error creating tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug when name changes
  useEffect(() => {
    if (formData.name && !formData.slug) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.name) }));
    }
  }, [formData.name]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to AI-BOS Platform
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Let's set up your workspace. You'll be able to install apps, collaborate with your team, 
              and manage your projects all in one place.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
              <div>
                <button
                  onClick={onSkip}
                  className="text-gray-500 hover:text-gray-700 underline"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Workspace</h2>
            
            <div className="space-y-6">
              {/* Workspace Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !validation.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your workspace name"
                />
                {!validation.name && (
                  <p className="mt-1 text-sm text-red-600">Workspace name must be at least 2 characters</p>
                )}
              </div>

              {/* Workspace Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace URL *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    aibos.com/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateFormData('slug', e.target.value)}
                    className={`flex-1 px-4 py-2 border rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !validation.slug ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="your-workspace"
                  />
                </div>
                {!validation.slug && (
                  <p className="mt-1 text-sm text-red-600">URL must be at least 2 characters and contain only letters, numbers, and hyphens</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about your workspace (optional)"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateFormData('website', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-website.com"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => updateFormData('contactEmail', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !validation.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="contact@your-workspace.com"
                />
                {!validation.email && (
                  <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Free Plan */}
              <div className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                formData.planType === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`} onClick={() => updateFormData('planType', 'free')}>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Free</h3>
                  <div className="text-3xl font-bold text-gray-900 mb-4">$0<span className="text-lg text-gray-500">/month</span></div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>✓ Up to 5 team members</li>
                    <li>✓ 1GB storage</li>
                    <li>✓ Basic apps</li>
                    <li>✓ Community support</li>
                  </ul>
                </div>
              </div>

              {/* Pro Plan */}
              <div className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                formData.planType === 'pro' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`} onClick={() => updateFormData('planType', 'pro')}>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro</h3>
                  <div className="text-3xl font-bold text-gray-900 mb-4">$29<span className="text-lg text-gray-500">/month</span></div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>✓ Up to 25 team members</li>
                    <li>✓ 10GB storage</li>
                    <li>✓ All apps</li>
                    <li>✓ Priority support</li>
                    <li>✓ Advanced analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">What's included in your plan:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {formData.planType === 'free' ? (
                  <>
                    <li>• Up to 5 team members</li>
                    <li>• 1GB storage space</li>
                    <li>• Access to basic apps</li>
                    <li>• Community support</li>
                  </>
                ) : (
                  <>
                    <li>• Up to 25 team members</li>
                    <li>• 10GB storage space</li>
                    <li>• Access to all apps</li>
                    <li>• Priority support</li>
                    <li>• Advanced analytics and insights</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <button
                onClick={createTenant}
                disabled={loading}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to {formData.name}!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your workspace has been created successfully. You can now start installing apps, 
              inviting team members, and building your digital workspace.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h3 className="font-medium text-green-900 mb-2">Your workspace is ready at:</h3>
              <p className="text-green-700 font-mono">aibos.com/{formData.slug}</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => onTenantCreated?.(formData as any)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="text-gray-500 hover:text-gray-700 underline"
                >
                  Create another workspace
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Welcome</span>
            <span>Workspace</span>
            <span>Plan</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default TenantOnboarding; 