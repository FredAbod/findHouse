class LocationService {
  constructor() {
    this.states = [
      'Lagos', 'Abuja', 'Rivers', 'Oyo', 'Kano'
      // Add more states as needed
    ];

    this.cities = {
      Lagos: ['Ikeja', 'Lekki', 'Victoria Island', 'Ikoyi'],
      Abuja: ['Wuse', 'Garki', 'Maitama', 'Asokoro'],
      // Add more cities for each state
    };
  }

  getStates() {
    return this.states;
  }

  getCities(state) {
    if (!state || !this.cities[state]) {
      throw new Error('Invalid state');
    }
    return this.cities[state];
  }
}

module.exports = new LocationService();
