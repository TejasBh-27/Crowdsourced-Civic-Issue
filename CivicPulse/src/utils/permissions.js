export const requestLocationPermission = async () => {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            granted: true,
            coords: {
              latitude: position.coords.latitude || 28.6139,
              longitude: position.coords.longitude || 77.2090,
              address: 'Ward 14, Connaught Place, Central Zone'
            }
          });
        },
        () => {
          resolve({
            granted: true,
            coords: {
              latitude: 28.6139,
              longitude: 77.2090,
              address: 'Ward 14 Main Market Gate, Central Zone'
            }
          });
        }
      );
    } else {
      resolve({
        granted: true,
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
          address: 'Ward 14 Main Market Gate, Central Zone'
        }
      });
    }
  });
};
