require("dotenv").config({ path: ".env.search" });
const {
  ELASTIC_HOST,
  ELASTIC_PORT,
  INDEX_STUDYGROUP,
} = process.env;

const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: `http://${ELASTIC_HOST}:${ELASTIC_PORT}` })


exports.searchStudyGroup = async (info) => {
  const { searchWord, category, isRecruit, tags } = info;

  const { body } = await client.search({
    index: INDEX_STUDYGROUP,
    body: {
      query: {
        bool: {
          must: [{
            match: {
              title: searchWord
            }
          }],
          filter: {
            term: {
              isRecruit: isRecruit
            }
          }
        }
      }
    }
  })

  const result = body.hits.hits.map((hit) => {
    return hit._source;
  })

  return result;
}
exports.searchAllStudyGroupWithFiltering = async (info) => {
  const { category, isRecruit, tags } = info;


  const { body } = await client.search({
    index: INDEX_STUDYGROUP,
    body: {
      query: {
        bool: {
          must: [{
            match_all: {}
          }],
          filter: {
            term: {
              isRecruit: isRecruit
            }
          }
        }
      }
    }
  })
  const result = body.hits.hits.map((hit) => {
    return hit._source;
  })

  return result;
}

exports.bulkStudyGroups = async (groups) => {

  const body = groups.flatMap((group) => {
    const id = group.id;

    delete group.id
    return [{ index: { _index: INDEX_STUDYGROUP, _type: "_doc", _id: id } }, group]
  })

  const { body: bulkResponse } = await client.bulk({ refresh: true, body })

  if (bulkResponse.errors) {
    const erroredDocuments = []

    bulkResponse.items.forEach((action, i) => {
      const operation = Object.keys(action)[0]

      if (action[operation].error) {
        erroredDocuments.push({

          status: action[operation].status,
          error: action[operation].error,
          operation: body[i * 2],
          document: body[i * 2 + 1]
        })
      }
    })
    console.log(erroredDocuments)
  }

}