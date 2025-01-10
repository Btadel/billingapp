
class AvlTreeNode {
    constructor(sourceWord, targetWord) {
      this.sourceWord = sourceWord;
      this.targetWord = targetWord;
      this.left = null;
      this.right = null;
      this.height = 1; 
    }
  }
  
  function getHeight(node) {
    if (!node) return 0;
    return node.height;
  }
  
  function traverseTree(root, result = []) {
    if (!root) return result;
  
    traverseTree(root.left, result);
    // On ajoute la paire (sourceWord, targetWord)
    result.push([root.sourceWord, root.targetWord]);
    traverseTree(root.right, result);
  
    return result;
  }

  function getBalance(node) {
    if (!node) return 0;
    return getHeight(node.left) - getHeight(node.right);
  }
  
 
  function updateHeight(node) {
    node.height =
      1 + Math.max(getHeight(node.left), getHeight(node.right));
  }
  
  
  function rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
  

    x.right = y;
    y.left = T2;
  
    updateHeight(y);
    updateHeight(x);
  
    return x;
  }
  
  function rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
  
    y.left = x;
    x.right = T2;
  
    updateHeight(x);
    updateHeight(y);
  
    return y;
  }
  

  function avlInsert(root, node) {
    
    if (!root) {
      return node; 
    }
  
    if (node.sourceWord < root.sourceWord) {
      root.left = avlInsert(root.left, node);
    } else {
      root.right = avlInsert(root.right, node);
    }
  
 
    updateHeight(root);
  
    
    const balance = getBalance(root);
  
    
    if (balance > 1 && node.sourceWord < root.left.sourceWord) {
      return rotateRight(root);
    }
  
   
    if (balance < -1 && node.sourceWord > root.right.sourceWord) {
      return rotateLeft(root);
    }
  

    if (balance > 1 && node.sourceWord > root.left.sourceWord) {
      root.left = rotateLeft(root.left);
      return rotateRight(root);
    }
  
    if (balance < -1 && node.sourceWord < root.right.sourceWord) {
      root.right = rotateRight(root.right);
      return rotateLeft(root);
    }
  
    
    return root;
  }
  

  function treeText(mapping) {
    let root = null;
  
    for (const [sourceWord, targetWord] of mapping) {
      const newNode = new AvlTreeNode(sourceWord, targetWord);
      root = avlInsert(root, newNode);
    }
  
    return root;
  }
  
  export default treeText;
  