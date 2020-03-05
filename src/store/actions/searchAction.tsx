import { I_State, Dispatch, ActionTypes } from '../../interfaces'
import { calcP2WSH, calcBnsState } from '../../helpers/bns'
import { getAddressHistoryAPI, getHeightAPI } from './../../api/blockstream'
import { addNewApiTaskAction } from './addNewApiTaskAction'
const { STORE_SEARCH_RESULTS_FAIL, STORE_SEARCH_RESULTS } = ActionTypes

/**
 * Get address,
 * tx with notification address,
 * calculate owner,
 * find current owner's forwarding info,
 * send/dispatch to reducer to store important data found
 * (No UTXO nor raw TX scan for speed in front page search necessary yet)
 */
export const searchAction = async (
  state: I_State,
  dispatch: Dispatch,
  router: any = undefined
) => {
  const domainName = state.alias + state.extension
  const apiPath = state.api.path

  // stop if no alias submitted, nothing to save to state
  if (!state.alias) {
    console.log('lost alias')
    return undefined
  }

  // find address for this alias
  const { notificationsAddress } = calcP2WSH(domainName, state.network)

  try {
    // 1. Get current blockheight from API so ownership is using latest possible info
    const currentHeight = await addNewApiTaskAction(state, dispatch, () =>
      getHeightAPI(state.network, apiPath)
    )

    // 2. Get API response for all tx history of this address
    // This will grab all tx that "notified" this address by sending to it
    // Upon failure error should be caught in this function
    const notificationsTxHistory = await addNewApiTaskAction(
      state,
      dispatch,
      () => getAddressHistoryAPI(notificationsAddress, state.network, apiPath)
    )

    // calculate bns data from this history via helper functions
    const { domain } = calcBnsState(
      notificationsTxHistory as Array<any>,
      domainName,
      currentHeight as number,
      state.network
    )

    // store data
    dispatch({
      type: STORE_SEARCH_RESULTS,
      payload: {
        alias: state.alias,
        domain,
        chain: {
          height: currentHeight
        }
      }
    })

    if (window.location.hash !== '#/') router.push('/')
  } catch (e) {
    console.log('searchAction issue found:', e)

    // still updating the notification address
    dispatch({
      type: STORE_SEARCH_RESULTS_FAIL,
      payload: {
        alias: state.alias, // can save alias
        domainName,
        notificationsAddress // can save this easy derivation
      }
    })
    if (window.location.hash !== '#/') router.push('/')
  }
}
