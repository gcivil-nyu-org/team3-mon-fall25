import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateListing from './CreateListing';
import * as listingsApi from '../api/listings';
import * as fileUtils from '../utils/fileUtils';

// Mock the API
vi.mock('../api/listings');
vi.mock('../utils/fileUtils');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CreateListing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fileUtils.validateImageFiles.mockReturnValue({ valid: true, error: null });
        fileUtils.formatFileSize.mockImplementation((bytes) => {
            if (bytes < 1024) return `${bytes} Bytes`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        });
    });

    describe('Rendering', () => {
        it('renders the create listing form', () => {
            renderWithRouter(<CreateListing />);
            expect(screen.getByText('Create a New Listing')).toBeInTheDocument();
            expect(screen.getByText('Fill in the details to list your item')).toBeInTheDocument();
        });

        it('renders all form fields', () => {
            renderWithRouter(<CreateListing />);
            expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/images/i)).toBeInTheDocument();
        });

        it('renders all category options', () => {
            renderWithRouter(<CreateListing />);
            const categorySelect = screen.getByLabelText(/category/i);
            expect(categorySelect).toBeInTheDocument();
            expect(screen.getByText('Electronics')).toBeInTheDocument();
            expect(screen.getByText('Books')).toBeInTheDocument();
            expect(screen.getByText('Furniture')).toBeInTheDocument();
            expect(screen.getByText('Sports')).toBeInTheDocument();
            expect(screen.getByText('Clothing')).toBeInTheDocument();
            expect(screen.getByText('Other')).toBeInTheDocument();
        });

        it('renders all dorm options', () => {
            renderWithRouter(<CreateListing />);
            const locationSelect = screen.getByLabelText(/location/i);
            expect(locationSelect).toBeInTheDocument();
            expect(screen.getByText('Othmer Hall')).toBeInTheDocument();
            expect(screen.getByText('Clark Hall')).toBeInTheDocument();
            expect(screen.getByText('Rubin Hall')).toBeInTheDocument();
            expect(screen.getByText('Weinstein Hall')).toBeInTheDocument();
            expect(screen.getByText('Brittany Hall')).toBeInTheDocument();
            expect(screen.getByText('Founders Hall')).toBeInTheDocument();
        });
    });

    describe('Form Input', () => {
        it('allows entering title', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            await user.type(titleInput, 'Test Item');
            expect(titleInput).toHaveValue('Test Item');
        });

        it('allows entering description', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const descInput = screen.getByLabelText(/description/i);
            await user.type(descInput, 'This is a test description');
            expect(descInput).toHaveValue('This is a test description');
        });

        it('allows entering price', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const priceInput = screen.getByLabelText(/price/i);
            await user.type(priceInput, '99.99');
            expect(priceInput).toHaveValue(99.99);
        });

        it('allows selecting category', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const categorySelect = screen.getByLabelText(/category/i);
            await user.selectOptions(categorySelect, 'Electronics');
            expect(categorySelect).toHaveValue('Electronics');
        });

        it('allows selecting location', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const locationSelect = screen.getByLabelText(/location/i);
            await user.selectOptions(locationSelect, 'Othmer Hall');
            expect(locationSelect).toHaveValue('Othmer Hall');
        });
    });

    describe('Image Upload', () => {
        it('handles image file selection', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const file = new File(['test'], 'test.png', { type: 'image/png' });
            const fileInput = screen.getByLabelText(/images/i);
            
            await user.upload(fileInput, file);
            
            expect(fileUtils.validateImageFiles).toHaveBeenCalled();
            expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
        });

        it('displays error when more than 10 images are selected', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const files = Array.from({ length: 11 }, (_, i) => 
                new File(['test'], `test${i}.png`, { type: 'image/png' })
            );
            const fileInput = screen.getByLabelText(/images/i);
            
            await user.upload(fileInput, files);
            
            await waitFor(() => {
                expect(screen.getByText('Maximum 10 images allowed')).toBeInTheDocument();
            });
        });

        it('displays error when image validation fails', async () => {
            const user = userEvent.setup();
            fileUtils.validateImageFiles.mockReturnValue({ 
                valid: false, 
                error: 'Image is too large' 
            });
            renderWithRouter(<CreateListing />);
            const file = new File(['test'], 'test.png', { type: 'image/png' });
            const fileInput = screen.getByLabelText(/images/i);
            
            await user.upload(fileInput, file);
            
            await waitFor(() => {
                expect(screen.getByText('Image is too large')).toBeInTheDocument();
            });
        });

        it('displays selected image file names and sizes', async () => {
            const user = userEvent.setup();
            fileUtils.formatFileSize.mockReturnValue('1.00 MB');
            renderWithRouter(<CreateListing />);
            const file = new File(['test'], 'test.png', { type: 'image/png', size: 1024 * 1024 });
            const fileInput = screen.getByLabelText(/images/i);
            
            await user.upload(fileInput, file);
            
            await waitFor(() => {
                expect(screen.getByText('test.png')).toBeInTheDocument();
            });
        });

        it('displays total file size', async () => {
            const user = userEvent.setup();
            fileUtils.formatFileSize.mockReturnValue('2.00 MB');
            renderWithRouter(<CreateListing />);
            const file1 = new File(['test1'], 'test1.png', { type: 'image/png', size: 1024 * 1024 });
            const file2 = new File(['test2'], 'test2.png', { type: 'image/png', size: 1024 * 1024 });
            const fileInput = screen.getByLabelText(/images/i);
            
            await user.upload(fileInput, [file1, file2]);
            
            await waitFor(() => {
                expect(screen.getByText(/total:/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form Validation', () => {
        it('shows error when title is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Title is required')).toBeInTheDocument();
            });
        });

        it('shows error when description is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Description is required')).toBeInTheDocument();
            });
        });

        it('shows error when price is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
            });
        });

        it('shows error when price is 0', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '0');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
            });
        });

        it('shows error when category is not selected', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Please select a category')).toBeInTheDocument();
            });
        });

        it('shows error when location is not selected', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Please select a location')).toBeInTheDocument();
            });
        });

        it('validates images before submission', async () => {
            const user = userEvent.setup();
            // First validation (on upload) passes, second (on submit) fails
            fileUtils.validateImageFiles
                .mockReturnValueOnce({ valid: true, error: null }) // First call on upload
                .mockReturnValueOnce({ valid: false, error: 'Image validation failed' }); // Second call on submit
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const fileInput = screen.getByLabelText(/images/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            const file = new File(['test'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Image validation failed')).toBeInTheDocument();
            });
        });
    });

    describe('Form Submission', () => {
        it('submits form with valid data', async () => {
            const user = userEvent.setup();
            listingsApi.createListing.mockResolvedValue({ id: 1 });
            renderWithRouter(<CreateListing />);
            
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(listingsApi.createListing).toHaveBeenCalled();
            });
            
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/my-listings');
            });
        });

        it('submits form with images', async () => {
            const user = userEvent.setup();
            listingsApi.createListing.mockResolvedValue({ id: 1 });
            renderWithRouter(<CreateListing />);
            
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const fileInput = screen.getByLabelText(/images/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            const file = new File(['test'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(listingsApi.createListing).toHaveBeenCalled();
                const formData = listingsApi.createListing.mock.calls[0][0];
                expect(formData).toBeInstanceOf(FormData);
            });
        });

        it('shows loading state during submission', async () => {
            const user = userEvent.setup();
            listingsApi.createListing.mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({ id: 1 }), 100))
            );
            renderWithRouter(<CreateListing />);
            
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            expect(screen.getByText('Creating...')).toBeInTheDocument();
            expect(submitButton).toBeDisabled();
        });

        it('handles 413 error (file too large)', async () => {
            const user = userEvent.setup();
            const error = new Error('Request Entity Too Large');
            error.response = { status: 413 };
            listingsApi.createListing.mockRejectedValue(error);
            renderWithRouter(<CreateListing />);
            
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText(/file\(s\) are too large/i)).toBeInTheDocument();
            });
        });

        it('handles API error with detail message', async () => {
            const user = userEvent.setup();
            const error = new Error('API Error');
            error.response = { data: { detail: 'Custom error message' } };
            listingsApi.createListing.mockRejectedValue(error);
            renderWithRouter(<CreateListing />);
            
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Custom error message')).toBeInTheDocument();
            });
        });

        it('handles API error with message field', async () => {
            const user = userEvent.setup();
            const error = new Error('API Error');
            error.response = { data: { message: 'Error message' } };
            listingsApi.createListing.mockRejectedValue(error);
            renderWithRouter(<CreateListing />);
            
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Error message')).toBeInTheDocument();
            });
        });

        it('handles generic API error', async () => {
            const user = userEvent.setup();
            const error = new Error('Network error');
            listingsApi.createListing.mockRejectedValue(error);
            renderWithRouter(<CreateListing />);
            
            const titleInput = screen.getByLabelText(/title/i);
            const descInput = screen.getByLabelText(/description/i);
            const priceInput = screen.getByLabelText(/price/i);
            const categorySelect = screen.getByLabelText(/category/i);
            const locationSelect = screen.getByLabelText(/location/i);
            const submitButton = screen.getByRole('button', { name: /create listing/i });
            
            await user.type(titleInput, 'Test Title');
            await user.type(descInput, 'Test Description');
            await user.type(priceInput, '99.99');
            await user.selectOptions(categorySelect, 'Electronics');
            await user.selectOptions(locationSelect, 'Othmer Hall');
            await user.click(submitButton);
            
            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });
    });

    describe('Input Focus/Blur', () => {
        it('handles input focus and blur events', async () => {
            const user = userEvent.setup();
            renderWithRouter(<CreateListing />);
            const titleInput = screen.getByLabelText(/title/i);
            
            await user.click(titleInput);
            expect(titleInput).toHaveFocus();
            
            await user.tab();
            expect(titleInput).not.toHaveFocus();
        });
    });
});

