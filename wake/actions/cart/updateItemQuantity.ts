import { HttpError } from "../../../utils/http.ts";
import { AppContext } from "../../mod.ts";
import { getCartCookie, setCartCookie } from "../../utils/cart.ts";
import {
  AddItemToCart,
  RemoveItemFromCart,
} from "../../utils/graphql/queries.ts";
import {
  AddItemToCartMutation,
  AddItemToCartMutationVariables,
  CheckoutFragment,
  RemoveItemFromCartMutation,
  RemoveItemFromCartMutationVariables,
} from "../../utils/graphql/storefront.graphql.gen.ts";

export interface Props {
  productVariantId: number;
  quantity: number;
  customization?: { customizationId: number; value: string }[];
  subscription?: { subscriptionGroupId: number; recurringTypeId: number };
}

const addToCart = (
  props: Props,
  cartId: string,
  ctx: AppContext,
) =>
  ctx.storefront.query<
    AddItemToCartMutation,
    AddItemToCartMutationVariables
  >({
    variables: {
      input: { id: cartId, products: [props] },
    },
    ...AddItemToCart,
  });

const removeFromCart = (
  props: Props,
  cartId: string,
  ctx: AppContext,
) =>
  ctx.storefront.query<
    RemoveItemFromCartMutation,
    RemoveItemFromCartMutationVariables
  >({
    variables: {
      input: { id: cartId, products: [{ ...props, quantity: 1e6 }] },
    },
    ...RemoveItemFromCart,
  });

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Partial<CheckoutFragment>> => {
  const cartId = getCartCookie(req.headers);

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  let data = await removeFromCart(props, cartId, ctx);

  if (props.quantity > 0) {
    data = await addToCart(props, cartId, ctx);
  }

  const checkoutId = data.checkout?.checkoutId;
  setCartCookie(ctx.response.headers, checkoutId);

  return data.checkout ?? {};
};

export default action;
