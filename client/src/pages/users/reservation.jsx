import React, { useEffect, useState, Fragment, useRef, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import moment, { Moment as MomentTypes } from "moment";
import useWindowSize from "../../lib/useWindowSize";
import {
  markerImage,
  hoverImage,
  mapOptions,
  setHoverImage,
  makeOverlay
} from "../../lib/kakaoMapUtils";
import StudyRoomList from "../../components/users/studyRoomList";
import { REQUEST_URL } from "../../config.json";

const { kakao } = window;
let studyRoomMap;

// state로 관리할 것
let selectedMarker = null;
let currentOverlay = null;

const MapView = styled.div`
  position: absolute;
  left: 408px;
`;

const MapSidebar = styled.div`
  width: 408px;
  position: absolute;
  overflow-y: scroll;
`;

function makeOverListener(map, marker, infowindow) {
  return function() {
    infowindow.open(map, marker);
  };
}
function makeOutListener(infowindow) {
  return function() {
    infowindow.close();
  };
}

const Reservation = ({ match }) => {
  const id = useRef();
  id.current = match.params.id;
  const mapElement = useRef();
  const [locaion, setLocation] = useState({ lat: null, lon: null });

  const [width, height] = useWindowSize();
  const [studyRooms, setStudyRooms] = useState([]);

  const addMarkerEvent = (marker, data) => {
    const infowindow = new kakao.maps.InfoWindow({
      content: data["cafe_name"]
    });

    marker.infowindow_over = makeOverListener(studyRoomMap, marker, infowindow);
    marker.infowindow_out = makeOutListener(infowindow);
    kakao.maps.event.addListener(marker, "click", function() {
      // setHoverImage(marker, data, selectedMarker, currentOverlay, studyRoomMap);

      marker.setImage(hoverImage);
      if (selectedMarker === marker) {
        marker.setImage(markerImage);
        currentOverlay.setMap(null);
        currentOverlay = null;
        selectedMarker = null;
        return;
      }
      if (selectedMarker !== marker) {
        // selectedMarker가 null이 아닌 경우
        if (!!selectedMarker) {
          selectedMarker.setImage(markerImage);
          !!currentOverlay && currentOverlay.setMap(null);
        }
        marker.setImage(hoverImage);
        // const overlay = makeOverlay(marker, data);
        makeOverlay(marker, data);
        marker.overlay.setMap(studyRoomMap);
        currentOverlay = marker.overlay;
        selectedMarker = marker;
        studyRoomMap.panTo(marker.getPosition());
        return;
      }
    });

    kakao.maps.event.addListener(marker, "mouseout", function() {
      if (!selectedMarker || selectedMarker !== marker) {
        marker.setImage(markerImage);
      }
      infowindow.close();
    });

    kakao.maps.event.addListener(marker, "mouseover", function() {
      infowindow.open(studyRoomMap, marker);
      marker.setImage(hoverImage);
    });
  };

  const drawMarker = (studyRoomData, map) => {
    const bounds = new kakao.maps.LatLngBounds();

    studyRoomData.forEach(room => {
      const location = room.location.coordinates;
      const studyRoomlat = location[1];
      const studyRoomlng = location[0];
      const kakaoPosition = new kakao.maps.LatLng(studyRoomlat, studyRoomlng);

      bounds.extend(kakaoPosition);
      const marker = new kakao.maps.Marker({
        map,
        position: kakaoPosition,
        title: room.title,
        image: markerImage
      });

      room.marker = marker;
      addMarkerEvent(marker, room);
    });

    map.setBounds(bounds);
  };

  useEffect(() => {
    axios
      .get(`${REQUEST_URL}/api/studygroup/detail/${id.current}`)
      .then(({ data }) => {
        const groupInfo = data.detailInfo;
        const { location, now_personnel, startTime, endTime, days } = groupInfo;

        const reservationDays = days.reduce((dates, day) => {
          const suffix = "T00:00:00.000Z";
          const dateFormat = {
            start: startTime,
            end: endTime
          };
          const week1 =
            moment()
              .add(1, "weeks")
              .startOf("isoWeek")
              .add(day - 1, "days")
              .format("YYYY-MM-DD") + suffix;
          const week2 =
            moment()
              .add(1, "weeks")
              .startOf("isoWeek")
              .add(day - 1, "days")
              .format("YYYY-MM-DD") + suffix;

          return dates.concat([
            { ...dateFormat, date: week1 },
            { ...dateFormat, date: week2 }
          ]);
        }, []);

        setLocation({ lat: locaion.lat, lon: locaion.lon });
        const requestBody = {
          geopoint: { longitude: location.lon, latitude: location.lat },
          personnel: now_personnel,
          startTime,
          endTime,
          dates: reservationDays
        };

        return new Promise(resolve => {
          axios
            .post(`${REQUEST_URL}/api/studyroom/availableRooms`, requestBody)
            .then(result => {
              const timeInfo = {
                startTime,
                endTime,
                days,
                dates: reservationDays
              };
              resolve({ timeInfo, availableRooms: result.data });
            });
        });
      })
      .then(({ availableRooms, timeInfo }) => {
        const rooms = availableRooms.map(d => ({ ...d, ...timeInfo }));
        setStudyRooms(rooms);
      })
      .catch(err => {
        console.log(err);
      });
    studyRoomMap = new kakao.maps.Map(mapElement.current, {
      center: new kakao.maps.LatLng(37.503077, 127.021947),
      level: 3
    });
    kakao.maps.event.addListener(studyRoomMap, "click", function() {
      console.log(currentOverlay, selectedMarker);
      if (currentOverlay && selectedMarker) {
        currentOverlay.setMap(null);
        selectedMarker.setImage(markerImage);
        currentOverlay = null;
        selectedMarker = null;
      }
    });
  }, []);

  useEffect(() => {
    if (!studyRoomMap) return;
    if (studyRooms.length <= 0) return;
    drawMarker(studyRooms, studyRoomMap);
  }, [studyRooms]);

  return (
    <Fragment>
      <MapSidebar style={{ height: height - 89 }}>
        <StudyRoomList data={studyRooms}></StudyRoomList>
      </MapSidebar>
      <MapView
        id="map"
        ref={mapElement}
        style={{ width: width - 408, height: height - 89 }}
      ></MapView>
    </Fragment>
  );
};
export default Reservation;
