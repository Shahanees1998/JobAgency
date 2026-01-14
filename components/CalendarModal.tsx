'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Chip } from 'primereact/chip';
import { Badge } from 'primereact/badge';
import { InputTextarea } from 'primereact/inputtextarea';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/store/toast.context';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  eventType: 'PERSONAL' | 'TRESTLE_BOARD';
  location?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface TrestleBoard {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  maxAttendees?: number;
  currentParticipants: number;
  isSignedUp?: boolean;
}

interface CalendarModalProps {
  visible: boolean;
  onHide: () => void;
}

const eventTypes = [
  { label: 'Personal Event', value: 'PERSONAL' },
  { label: 'Trestle Board', value: 'TRESTLE_BOARD' },
];

export default function CalendarModal({ visible, onHide }: CalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [trestleBoards, setTrestleBoards] = useState<TrestleBoard[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    eventType: 'PERSONAL' as 'PERSONAL' | 'TRESTLE_BOARD',
    location: '',
  });

  const { showToast } = useToast();

  // Fetch events for the selected month
  const fetchEvents = async (date: Date) => {
    try {
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const response = await apiClient.get('/calendar', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (response.data && Array.isArray(response.data)) {
        setEvents(response.data);
      } else if (response.data && (response.data as any).events) {
        setEvents((response.data as any).events);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      showToast('error', 'Error','Failed to fetch events');
    }
  };

  // Initialize trestle boards as empty since this is demo functionality
  const fetchTrestleBoards = async () => {
    setTrestleBoards([]);
  };

  useEffect(() => {
    if (visible) {
      const today = new Date();
      setSelectedDate(today);
      fetchEvents(today);
      fetchTrestleBoards();
    }
  }, [visible]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchEvents(date);
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      startDate: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      eventType: 'PERSONAL',
      location: '',
    });
    setShowEventForm(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      startDate: new Date(event.startDate).toISOString().split('T')[0],
      eventType: event.eventType,
      location: event.location || '',
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await apiClient.delete(`/calendar/${eventId}`);
      if (!response.error) {
        showToast('success','Success', 'Event deleted successfully');
        if (selectedDate) {
          fetchEvents(selectedDate);
        }
      } else {
        showToast('error', 'Error',response.error);
      }
    } catch (error) {
      showToast('error', 'Error','Failed to delete event');
    }
  };

  const handleSubmitEvent = async () => {
    try {
      let response;
      if (editingEvent) {
        response = await apiClient.put(`/calendar/${editingEvent.id}`, eventForm);
        if (!response.error) {
          showToast('success','Success', 'Event updated successfully');
        } else {
          showToast('error', 'Error',response.error);
        }
      } else {
        response = await apiClient.post('/calendar', eventForm);
        if (!response.error) {
          showToast('success','Success', 'Event created successfully');
        } else {
          showToast('error', 'Error',response.error);
        }
      }
      
      if (!response.error) {
        setShowEventForm(false);
        if (selectedDate) {
          fetchEvents(selectedDate);
        }
      }
    } catch (error) {
      showToast('error', 'Error',editingEvent ? 'Failed to update event' : 'Failed to create event');
    }
  };

  const handleSignupTrestleBoard = async (trestleBoardId: string) => {
    try {
      const response = await apiClient.post(`/trestle-board/${trestleBoardId}/signup`, {});
      if (!response.error) {
        showToast('success','Success', 'Successfully signed up for trestle board');
        fetchTrestleBoards();
      } else {
        showToast('error', 'Error',response.error);
      }
    } catch (error) {
      showToast('error', 'Error','Failed to sign up for trestle board');
    }
  };

  const handleCancelSignup = async (trestleBoardId: string) => {
    try {
      const response = await apiClient.delete(`/trestle-board/${trestleBoardId}/signup`);
      if (!response.error) {
        showToast('success','Success', 'Signup cancelled successfully');
        fetchTrestleBoards();
      } else {
        showToast('error', 'Error',response.error);
      }
    } catch (error) {
      showToast('error', 'Error','Failed to cancel signup');
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.startDate.startsWith(dateStr));
  };

  const renderEventForm = () => (
    <Dialog
      visible={showEventForm}
      onHide={() => setShowEventForm(false)}
      header={editingEvent ? 'Edit Event' : 'Add Event'}
      modal
      className="w-full max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <InputText
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            className="w-full"
            placeholder="Event title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date *</label>
          <Calendar
            value={eventForm.startDate ? new Date(eventForm.startDate) : null}
            onChange={(e) => setEventForm({ ...eventForm, startDate: e.value ? e.value.toISOString().split('T')[0] : '' })}
            dateFormat="yy-mm-dd"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Event Type *</label>
          <Dropdown
            value={eventForm.eventType}
            onChange={(e) => setEventForm({ ...eventForm, eventType: e.value })}
            options={eventTypes}
            optionLabel="label"
            optionValue="value"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <InputText
            value={eventForm.location}
            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            className="w-full"
            placeholder="Event location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <InputTextarea
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            rows={3}
            className="w-full"
            placeholder="Event description"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={() => setShowEventForm(false)}
          />
          <Button
            label={editingEvent ? 'Update' : 'Create'}
            onClick={handleSubmitEvent}
            disabled={!eventForm.title || !eventForm.startDate}
          />
        </div>
      </div>
    </Dialog>
  );

  const renderTrestleBoards = () => (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Available Trestle Boards</h3>
      <div className="space-y-3">
        {trestleBoards.map((board) => (
          <Card key={board.id} className="shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium">{board.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(board.startDate).toLocaleDateString()}
                </p>
                {board.location && (
                  <p className="text-sm text-gray-600">📍 {board.location}</p>
                )}
                {board.description && (
                  <p className="text-sm text-gray-600 mt-1">{board.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Chip label={`${board.currentParticipants} participants`} />
                  {board.maxAttendees && (
                    <Chip label={`Max: ${board.maxAttendees}`} className="bg-gray-100" />
                  )}
                </div>
              </div>
              <div className="ml-4">
                {board.isSignedUp ? (
                  <Button
                    label="Cancel"
                    severity="danger"
                    size="small"
                    onClick={() => handleCancelSignup(board.id)}
                  />
                ) : (
                  <Button
                    label="Sign Up"
                    size="small"
                    onClick={() => handleSignupTrestleBoard(board.id)}
                    disabled={board.maxAttendees ? board.currentParticipants >= board.maxAttendees : false}
                  />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        visible={visible}
        onHide={onHide}
        header="Calendar"
        modal
        className="w-full max-w-4xl"
        style={{ width: '90vw' }}
      >
        <div className="flex gap-6">
          {/* Calendar View */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">My Events</h3>
              <Button
                label="Add Event"
                icon="pi pi-plus"
                onClick={handleAddEvent}
              />
            </div>
            
            <Calendar
              value={selectedDate}
              onChange={(e) => handleDateSelect(e.value || new Date())}
              inline
              showWeek
              dateTemplate={(date) => {
                const eventsForDate = getEventsForDate(new Date(date.year, date.month, date.day));
                return (
                  <div className="relative">
                    <span>{date.day}</span>
                    {eventsForDate.length > 0 && (
                      <Badge
                        value={eventsForDate.length}
                        severity="info"
                        className="absolute -top-1 -right-1 text-xs"
                      />
                    )}
                  </div>
                );
              }}
            />

            {/* Events for selected date */}
            {selectedDate && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">
                  Events for {selectedDate.toLocaleDateString()}
                </h4>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map((event) => (
                    <Card key={event.id} className="shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium">{event.title}</h5>
                          <p className="text-sm text-gray-600">
                            {event.eventType === 'PERSONAL' ? 'Personal Event' : 'Trestle Board'}
                          </p>
                          {event.location && (
                            <p className="text-sm text-gray-600">📍 {event.location}</p>
                          )}
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            icon="pi pi-pencil"
                            size="small"
                            severity="secondary"
                            onClick={() => handleEditEvent(event)}
                          />
                          <Button
                            icon="pi pi-trash"
                            size="small"
                            severity="danger"
                            onClick={() => handleDeleteEvent(event.id)}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No events for this date</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Trestle Boards Sidebar */}
          <div className="w-80">
            {renderTrestleBoards()}
          </div>
        </div>
      </Dialog>

      {renderEventForm()}
    </>
  );
} 