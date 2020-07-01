import _ from "lodash"
import path from "path"

// Input queryStringParent could be:
//   Product
//   allProduct
//   allProduct(filter: thing)
// End result should be something like { allProducts { nodes { id }}}
export function generateQueryFromString(
  queryStringParent: string,
  fileAbsolutePath: string
): string {
  const fields = extractUrlParamsForQuery(fileAbsolutePath)
  if (queryStringParent.includes(`...CollectionPagesQueryFragment`)) {
    return fragmentInterpolator(queryStringParent, fields)
  }
  const needsAllPrefix = queryStringParent.startsWith(`all`) === false

  return `{${
    needsAllPrefix ? `all` : ``
  }${queryStringParent}{nodes{${fields}}}}`
}

// Takes a query result of something like `{ fields: { value: 'foo' }}` with a filepath of `/fields__value` and
// translates the object into `{ fields__value: 'foo' }`. This is necassary to pass the value
// into a query function for each individual page.
export function reverseLookupParams(
  queryResults: Record<string, object | string>,
  absolutePath: string
): Record<string, string> {
  const reversedParams = {}

  absolutePath.split(path.sep).forEach(part => {
    const regex = /^\{([a-zA-Z_]+)\}/.exec(part)

    if (regex === null) return
    const extracted = regex[1]

    const results = _.get(
      queryResults.nodes ? queryResults.nodes[0] : queryResults,
      extracted.replace(/__/g, `.`)
    )
    reversedParams[extracted] = results
  })

  return reversedParams
}

// Changes something like
//   `/Users/site/src/pages/foo/{id}/{baz}`
// to
//   `id,baz`
function extractUrlParamsForQuery(createdPath: string): string {
  const parts = createdPath.split(path.sep)
  return parts
    .reduce<string[]>((queryParts: string[], part: string): string[] => {
      if (part.startsWith(`{`)) {
        return queryParts.concat(
          deriveNesting(
            part.replace(`{`, ``).replace(`}`, ``).replace(`.js`, ``)
          )
        )
      }

      return queryParts
    }, [])
    .join(`,`)
}

// pulls out nesting from file names with the special __ syntax
// src/pages/{fields__baz}.js => `fields{baz}`
function deriveNesting(part: string): string {
  if (part.includes(`__`)) {
    return part
      .split(`__`)
      .reverse()
      .reduce((path: string, part: string): string => {
        if (path) {
          return `${part}{${path}}`
        }
        return `${part}${path}`
      }, ``)
  }
  return part
}

function fragmentInterpolator(query: string, fields: string): string {
  return query.replace(`...CollectionPagesQueryFragment`, `nodes{${fields}}`)
}