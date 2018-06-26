import union from "lodash/union";
import {makeRandomId} from "./random";

const cutChars = string => `${string}-----`.substr(0, 5);

export function isTimeDimension(dimension) {
  return dimension.dimensionType === 1 || dimension.name === "Date";
}

export function injectCubeInfoOnMeasure(cubes) {
  // ensure `cubes` is an array
  cubes = [].concat(cubes);

  let nCbs = cubes.length;
  while (nCbs--) {
    const cube = cubes[nCbs];

    const cbName = cube.caption || cube.name;
    const cbTopic = cube.annotations.topic;
    const cbSubtopic = cube.annotations.subtopic;
    const selectorKey = `${cbTopic}-${cbSubtopic}-`;
    const sortKey = `${cutChars(cbTopic)}-${cutChars(cbSubtopic)}-`;
    const sourceName = cube.annotations.source_name;
    // const sourceDesc = cube.annotations.source_description;
    // const sourceLink = cube.annotations.source_link;
    // const datasetName = cube.annotations.dataset_name;
    // const datasetLink = cube.annotations.dataset_link;

    let nMsr = cube.measures.length;
    while (nMsr--) {
      const measure = cube.measures[nMsr];
      const annotations = measure.annotations;
      annotations._key = makeRandomId();
      annotations._cb_name = cbName;
      annotations._cb_topic = cbTopic;
      annotations._cb_subtopic = cbSubtopic;
      annotations._cb_sourceName = sourceName;
      annotations._selectorKey =
        selectorKey + (measure.caption || measure.name);
      annotations._sortKey = `${sortKey}${measure.caption ||
        measure.name}`.toLowerCase();
      // annotations._source_desc = sourceDesc;
      // annotations._source_link = sourceLink;
      // annotations._dataset_name = datasetName;
      // annotations._dataset_link = datasetLink;
    }
  }
}

export function getValidMeasures(cubes) {
  cubes = [].concat(cubes);
  const measures = [];

  let nCbs = cubes.length;
  while (nCbs--) {
    const cube = cubes[nCbs];
    let nMsr = cube.measures.length;
    while (nMsr--) {
      const measure = cube.measures[nMsr];
      // TODO: ensure this is checked server-side and remove
      if (/\smoe$/i.test(measure.name)) {
        continue;
      }
      const key = measure.annotations.error_for_measure;
      if (key === undefined) {
        measures.push(measure);
      }
    }
  }

  return measures.sort((a, b) =>
    a.annotations._selectorKey.localeCompare(b.annotations._selectorKey)
  );
}

export function getMeasureMOE(cube, measure) {
  const measureName = RegExp(measure.name, "i");

  if (cube.measures.indexOf(measure) > -1) {
    let nMsr = cube.measures.length;
    while (nMsr--) {
      const currentMeasure = cube.measures[nMsr];

      const key = currentMeasure.annotations.error_for_measure;
      if (key && measureName.test(key)) {
        return currentMeasure;
      }
    }
  }

  return undefined;
}

export function getValidDimensions(cube) {
  return cube.dimensions.filter(dim => !isTimeDimension(dim));
}

export function getValidDrilldowns(cube) {
  return getValidDimensions(cube).reduce(reduceLevelsFromDimension, []);
}

export function reduceLevelsFromDimension(container, dimension) {
  return isTimeDimension(dimension)
    ? container
    : dimension.hierarchies.reduce(reduceLevelsFromHierarchy, container);
}

export function reduceLevelsFromHierarchy(container, hierarchy) {
  return container.concat(hierarchy.levels.slice(1));
}

export function joinDrilldownList(array, drilldown) {
  array = array.filter(dd => dd.hierarchy !== drilldown.hierarchy);
  drilldown = [].concat(drilldown || []);
  return union(array, drilldown).sort(
    (a, b) =>
      a.hierarchy.dimension.dimensionType - b.hierarchy.dimension.dimensionType
  );
}

export function getTimeDrilldown(cube) {
  const timeDim = cube.timeDimension || cube.dimensionsByName.Date;
  if (timeDim) {
    const timeHie = timeDim.hierarchies.slice(-1).pop();
    if (timeHie) {
      return timeHie.levels.slice(1, 2).pop();
    }
  }
  return undefined;
}

export function composePropertyName(item) {
  let txt = item.name;
  if ("hierarchy" in item) {
    const hname = item.hierarchy.name;
    if (hname !== item.name && hname !== item.hierarchy.dimension.name) {
      txt = `${item.hierarchy.name} › ${txt}`;
    }
    if (item.name !== item.hierarchy.dimension.name) {
      txt = `${item.hierarchy.dimension.name} › ${txt}`;
    }
  }
  return txt;
}
