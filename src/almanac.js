import Promise from 'bluebird';
//import googleapis from 'googleapis';
const {google} = require('googleapis');
import _ from 'lodash';
import moment from 'moment';

/**
 * Almanac class for communicating with Analytics via googleapis
 * @param {object} opts Options { serviceEmail: 'googleemail', serviceKey: 'pemkeycontents..' }
 */
class Almanac {

  constructor(opts) {
    //this.auth = google.auth.getClient({
      //scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    //});

    this.gapi = google.calendar('v3');

    if (opts.subjectEmail) {
      console.log('subjectEmail');
      this.subjectEmail = opts.subjectEmail;
    }
  }

  /**
   * Internal method for making requests to Analytics
   * @param  {object} opts All the opts
   * @return {Promise}        Promise
   */
  async readCalendar(opts) {
    var auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });
    if (auth instanceof google.auth.JWT) {
      //auth.subject = this.subjectEmail;
    }
  
    opts = opts || {};
    var self = this;
    var events;

    opts.duration = opts.duration || 4;
    console.log('Read calendar');
    console.log(opts.calendar.id);

    if (!self.gapi || !self.gapi.events || self.gapi.events.length === 0) {
      return reject('Failed to initialise calendar client or no events');
    }

    var response = await self.gapi.events.list({
      calendarId: opts.calendar.id,
      orderBy: 'startTime',
      singleEvents: true,
      timeMin: moment().format(),
      timeMax: moment().add(opts.duration, 'days').format(),
      auth: auth
    });
    /*
      if (!response) {
        console.warn(`Calendar ${opts.calendar.id} cannot be read. Check settings`);
        console.log('Error', err);
        events = [{
          title: "",
          body: "Failed to read calendar.",
          calendar: {
            id: opts.calendar.id,
            name: "",
            title: opts.calendar.title
          },
          location: "",
          start: "",
          end: ""
        }];
      }
      else if (!response.items || response.items.length === 0) {
        console.warn('No items found with calendarId:', opts.calendar.id);
        console.log('Response', response);
        events = [{
          title: "",
          body: "No upcoming events.",
          calendar: {
            id: opts.calendar.id,
            name: "",
            title: opts.calendar.title
          },
          location: "",
          start: "",
          end: ""
        }];
      }
      else 
      {
        */
    console.log('Valid response');
    //console.log("Valid response ", response.data.items);
    events = response.data.items.map((event) => {
      return {
        title: event.summary,
        body: event.description,
        calendar: {
          id: opts.calendar.id,
          name: response.summary,
          title: opts.calendar.title || response.summary
        },
        location: event.location,
        start: moment(event.start.dateTime).valueOf(),
        end: moment(event.end.dateTime).valueOf()
      };
    });

    return events;
  }

  /**
   * Read calendar events from multiple calendars
   * @param  {object} opts All the params
   * @param  {array} opts.calendars Array of calendars where each entry has { title: 'name cal', id: '123123' }
   * @return {Promise}     Promise that resolves with events
   */
  readMultipleCalendars(opts) {
    //console.log('readMultipleCalendars');
    const calendarPromises = opts.calendars.map((calendar) => {
      return this.readCalendar({ calendar: calendar });
    });

    return new Promise((resolve, reject) => {
      Promise.all(calendarPromises)
      .then((calendars) => {
        var events = calendars.reduce((arr, calendar) => {
          return arr.concat(calendar);
        })
        .filter((event) => {
          if (opts.location) {
            return event.location === opts.location;
          } else {
            return true;
          }
        })
        .sort((a, b) => {
          return a.start - b.start;
        });

        resolve(events);
      })
      .catch(reject);
    });
  }

}

export default Almanac;
