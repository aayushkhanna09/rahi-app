export const INDIAN_STATES = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Delhi",
                "stateCode": "DL"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [76.8, 28.2], // Bottom-Left
                    [77.6, 28.2], // Bottom-Right
                    [77.6, 29.0], // Top-Right
                    [76.8, 29.0], // Top-Left
                    [76.8, 28.2]  // Close
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Maharashtra",
                "stateCode": "MH"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [72.0, 18.0],
                    [74.0, 18.0],
                    [74.0, 20.0],
                    [72.0, 20.0],
                    [72.0, 18.0]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Karnataka",
                "stateCode": "KA"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [76.5, 12.0],
                    [78.5, 12.0],
                    [78.5, 14.0],
                    [76.5, 14.0],
                    [76.5, 12.0]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Rajasthan",
                "stateCode": "RJ"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [74.0, 25.0],
                    [77.0, 25.0],
                    [77.0, 28.0],
                    [74.0, 28.0],
                    [74.0, 25.0]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Goa",
                "stateCode": "GA"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [73.5, 14.5],
                    [74.5, 14.5],
                    [74.5, 16.0],
                    [73.5, 16.0],
                    [73.5, 14.5]
                ]]
            }
        }
    ]
};
